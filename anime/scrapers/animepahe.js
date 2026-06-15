const fs = require("fs").promises;
const path = require("path");
const Config = require("../utils/config");
const { JSDOM } = require("jsdom");
const vm = require("vm");
const RequestManager = require("../utils/requestManager");
const flaresolverr = require("../utils/flaresolverr");
const { launchBrowser } = require("../utils/browser");
const { CustomError } = require("../middleware/errorHandler");
const os = require("os");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Fix #1: Global concurrency limit for browser operations ───
// Prevents OOM crash under load. Max 5 concurrent browser operations server-wide.
// Others wait in queue. Uses p-limit (zero sub-deps, ~1KB).
const pLimitModule = require("p-limit");
const pLimit = pLimitModule.default || pLimitModule;
const browserLimit = pLimit(5);

// ─── Fix #2: IFRAME_CACHE with size cap + periodic cleanup ───
// Prevents unbounded memory growth → OOM over hours/days.
const IFRAME_CACHE = new Map();
const IFRAME_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const IFRAME_CACHE_MAX_SIZE = 500;
const IFRAME_CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

setInterval(() => {
  const now = Date.now();
  let evicted = 0;
  // Evict expired entries
  for (const [key, val] of IFRAME_CACHE.entries()) {
    if (now - val.timestamp > IFRAME_CACHE_TTL) {
      IFRAME_CACHE.delete(key);
      evicted++;
    }
  }
  // Enforce max size (evict oldest first)
  while (IFRAME_CACHE.size > IFRAME_CACHE_MAX_SIZE) {
    const oldestKey = IFRAME_CACHE.keys().next().value;
    IFRAME_CACHE.delete(oldestKey);
    evicted++;
  }
  if (evicted > 0) {
    console.log(`[IFRAME_CACHE] Evicted ${evicted} entries (size: ${IFRAME_CACHE.size})`);
  }
}, IFRAME_CACHE_CLEANUP_INTERVAL);

class Animepahe {
  constructor() {
    this.cookiesPath = path.join("/tmp", "cookies.json");
    this.cookiesRefreshInterval = 14 * 24 * 60 * 60 * 1000; // 14 days
    this.isRefreshingCookies = false;
    this.activeBrowser = null;
    this.cloudflareSessionCookies = null;

    this.currentKwikRequest = null;
    
    this.cdnCookies = null;
    this.lastIframeCookies = null;

    this.persistentBrowser = null;
    this.browserReady = false;
  }

  /**
   * S4: Called once at server startup. Launches a browser, solves DDoS-Guard,
   * saves cookies to disk, and keeps the browser alive for fallback use.
   *
   * WHAT THIS DOES:
   * 1. Launches a Chromium browser (one-time, ~3-5s)
   * 2. Navigates to animepahe.pw and waits for DDoS-Guard challenge (~15-40s)
   * 3. Also visits /api to get API-specific session cookies
   * 4. Extracts all cookies and saves to /tmp/cookies.json
   * 5. Sets cookies in Config for immediate use by fetchWithCookies()
   * 6. Closes the page but KEEPS the browser alive for fallback
   *
   * TOTAL TIME: ~30-60s (one-time at startup)
   * AFTER THIS: All requests use axios + cookies (~0.5-2s each)
   *
   * If FlareSolverr is disabled, startup skips browser-based cookie solving.
   */
  async initialize() {
    if (flaresolverr.isEnabled()) {
      console.log(
        "[animepahe] FlareSolverr enabled, extracting cookies for image proxy...",
      );
      try {
        const cookieHeader = await flaresolverr.fetchCookies(
          Config.getUrl("home"),
        );
        if (cookieHeader) {
          Config.setCookies(cookieHeader);
          console.log(
            "[animepahe] ✅ Main domain cookies extracted",
          );
        }
      } catch (err) {
        console.warn(
          "[animepahe] ⚠️ Cookie extraction via FlareSolverr failed:",
          err.message,
        );
      }

      try {
        const apiCookieHeader = await flaresolverr.fetchCookies(
          `${Config.baseUrl}/api?m=airing&page=1`,
        );
        if (apiCookieHeader && Config.cookies) {
          const merged = Config.cookies + "; " + apiCookieHeader;
          const unique = new Map();
          merged.split("; ").forEach((c) => {
            const [k, ...v] = c.split("=");
            if (k && v.length) unique.set(k.trim(), v.join("="));
          });
          Config.setCookies(
            [...unique].map(([k, v]) => k + "=" + v).join("; "),
          );
          console.log("[animepahe] ✅ API route cookies extracted");
        } else if (apiCookieHeader) {
          Config.setCookies(apiCookieHeader);
          console.log("[animepahe] ✅ API route cookies extracted");
        }
      } catch (err) {
        console.warn(
          "[animepahe] ⚠️ API route cookie extraction failed:",
          err.message,
        );
      }

      // Also fetch cookies for i.animepahe.pw (image CDN)
      try {
        const imgCookies = await flaresolverr.fetchCookies(
          "https://i.animepahe.pw/snapshots/dummy",
        );
        if (imgCookies && Config.cookies) {
          const merged = Config.cookies + "; " + imgCookies;
          const unique = new Map();
          merged.split("; ").forEach((c) => {
            const [k, ...v] = c.split("=");
            if (k && v.length) unique.set(k.trim(), v.join("="));
          });
          Config.setCookies(
            [...unique].map(([k, v]) => k + "=" + v).join("; "),
          );
          console.log("[animepahe] ✅ Image CDN cookies extracted");
        }
      } catch (err) {
        console.warn("[animepahe] ⚠️ Image CDN cookie extraction failed:", err.message);
      }
      return true;
    }
    console.warn(
      "[animepahe] FlareSolverr disabled; skipping browser-based cookie pre-fetch.",
    );
    this.browserReady = false;
    return false;
  }

  /**
   * Synchronous cookie freshness check (used at startup before async init).
   */
  needsCookieRefreshSync() {
    try {
      const data = require("fs").readFileSync(this.cookiesPath, "utf8");
      const cookieData = JSON.parse(data);
      if (cookieData?.timestamp) {
        const ageInMs = Date.now() - cookieData.timestamp;
        return ageInMs > this.cookiesRefreshInterval;
      }
      return true;
    } catch {
      return true;
    }
  }

  async needsCookieRefresh() {
    try {
      const cookieData = JSON.parse(
        await fs.readFile(this.cookiesPath, "utf8"),
      );

      if (cookieData?.timestamp) {
        const ageInMs = Date.now() - cookieData.timestamp;
        return ageInMs > this.cookiesRefreshInterval;
      }
      return true;
    } catch (error) {
      return true;
    }
  }

  async refreshCookies() {
    if (flaresolverr.isEnabled()) {
      return;
    }

    throw new CustomError(
      "FlareSolverr is required for anime requests; browser cookie refresh is disabled",
      503,
    );
  }

  async getCookies(userProvidedCookies = null) {
    if (flaresolverr.isEnabled() && !userProvidedCookies) {
      return "";
    }

    // If user provided cookies directly, use them
    if (userProvidedCookies) {
      if (
        typeof userProvidedCookies === "string" &&
        userProvidedCookies.trim()
      ) {
        console.log("Using user-provided cookies");
        Config.setCookies(userProvidedCookies.trim());
        return userProvidedCookies.trim();
      } else {
        throw new CustomError("Invalid user-provided cookies format", 400);
      }
    }

    let cookieData;
    try {
      cookieData = JSON.parse(await fs.readFile(this.cookiesPath, "utf8"));
    } catch (error) {
      // No cookies: must block and refresh
      await this.refreshCookies();
      cookieData = JSON.parse(await fs.readFile(this.cookiesPath, "utf8"));
    }

    // Proactive background refresh if cookies are older than 13 days
    const ageInMs = Date.now() - cookieData.timestamp;
    if (
      ageInMs > this.cookiesRefreshInterval - 24 * 60 * 60 * 1000 &&
      !this.isRefreshingCookies
    ) {
      this.isRefreshingCookies = true;
      this.refreshCookies()
        .catch((err) => console.error("Background cookie refresh failed:", err))
        .finally(() => {
          this.isRefreshingCookies = false;
        });
    }

    const cookieHeader = cookieData.cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    Config.setCookies(cookieHeader);
    return cookieHeader;
  }

  async fetchApiData(endpoint, params = {}, userProvidedCookies = null, forceBrowser = false) {
    try {
      const cookieHeader = await this.getCookies(userProvidedCookies);
      const url = new URL(endpoint, Config.getUrl("home")).toString();
      
      // Use browser-based fetch if forced (after cookie refresh)
      if (forceBrowser) {
        return await RequestManager.fetchApiDataWithBrowser(url, params);
      }
      
      return await RequestManager.fetchApiData(url, params, cookieHeader);
    } catch (error) {
      // Retry with browser fallback on auth errors (401, 403, 503)
      const statusCode = error.statusCode || error.response?.status;
      if (
        !flaresolverr.isEnabled() &&
        !userProvidedCookies &&
        !forceBrowser &&
        (statusCode === 401 || statusCode === 403 || statusCode === 503)
      ) {
        console.log("[fetchApiData] Cookie invalid, refreshing and retrying with browser...");
        await this.refreshCookies();
        // Force browser-based fetch on retry
        return this.fetchApiData(endpoint, params, userProvidedCookies, true);
      }
      throw new CustomError(
        error.message || "Failed to fetch API data",
        error.response?.status || error.statusCode || 503,
      );
    }
  }

  async fetchAiringData(page = 1, userProvidedCookies = null) {
    return this.fetchApiData(
      "/api",
      { m: "airing", page },
      userProvidedCookies,
    );
  }

  async fetchSearchData(query, page, userProvidedCookies = null) {
    if (!query) {
      throw new CustomError("Search query is required", 400);
    }
    return this.fetchApiData(
      "/api",
      { m: "search", q: query, page },
      userProvidedCookies,
    );
  }

  async fetchQueueData(userProvidedCookies = null) {
    return this.fetchApiData("/api", { m: "queue" }, userProvidedCookies);
  }

  async fetchAnimeRelease(id, sort, page, userProvidedCookies = null) {
    if (!id) {
      throw new CustomError("Anime ID is required", 400);
    }
    return this.fetchApiData(
      "/api",
      { m: "release", id, sort, page },
      userProvidedCookies,
    );
  }

  // Scraping Methods
  async scrapeAnimeInfo(animeId) {
    if (!animeId) {
      throw new CustomError("Anime ID is required", 400);
    }

    const url = `${Config.getUrl("animeInfo")}${animeId}`;
    const cookieHeader = await this.getCookies();
    const html = await RequestManager.fetch(url, cookieHeader);

    if (!html) {
      throw new CustomError("Failed to fetch anime info", 503);
    }

    return html;
  }

  async scrapeAnimeList(page, tab, genre) {
    const url = Config.getUrl("animeList", { page, tab, genre });

    const cookieHeader = await this.getCookies();
    const html = await RequestManager.fetch(url, cookieHeader);

    if (!html) {
      throw new CustomError("Failed to fetch anime list", 503);
    }

    return html;
  }

  async scrapePlayPage(id, episodeId) {
    if (!id || !episodeId) {
      throw new CustomError("Both ID and episode ID are required", 400);
    }

    const url = Config.getUrl("play", { id, episodeId });

    return browserLimit(async () => {
      const source = flaresolverr.isEnabled() ? "FlareSolverr" : "cookies";
      console.log(`[Play Page] Primary path: ${source}`);
      const html = await RequestManager.fetchWithCookies(url);

      if (
        html &&
        html.length > 100 &&
        !html.toLowerCase().includes("just a moment") &&
        !html.toLowerCase().includes("checking your browser") &&
        !html.toLowerCase().includes("ddos protection by cloudflare") &&
        !html.toLowerCase().includes("ddg-cookie")
      ) {
        console.log(`[Play Page] ✅ Primary path success (${source})`);
        return html;
      }

      throw new CustomError(
        `Failed to fetch play page via ${source}; challenge page returned`,
        503,
      );
    });
  }

  async fetchIframeHtml(id, episodeId, url) {
    if (!url) {
      throw new CustomError("URL is required", 400);
    }

    console.log("Initiating iframe HTML fetch:", url);

    const IFRAME_STRATEGY_TIMEOUT = 25000; // 25s per strategy

    const allStrategies = [
      () => this.scrapeIframeCloudscraper(url),
      () => this.scrapeIframeLight(url),
    ];

    const maxParallel = 2;

    for (let i = 0; i < allStrategies.length; i += maxParallel) {
      const batch = allStrategies.slice(i, i + maxParallel);
      console.log(
        `Trying ${batch.length} strategies in parallel (batch ${Math.floor(i / maxParallel) + 1}/${Math.ceil(allStrategies.length / maxParallel)})...`,
      );

      const promises = batch.map(async (strategy, idx) => {
        const strategyPromise = strategy();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Strategy timed out after ${IFRAME_STRATEGY_TIMEOUT / 1000}s`)), IFRAME_STRATEGY_TIMEOUT);
        });

        try {
          console.log(`Starting strategy ${i + idx + 1} in parallel...`);
          const result = await Promise.race([strategyPromise, timeoutPromise]);
          if (result && result.length > 100) {
            console.log(`Strategy ${i + idx + 1} succeeded`);
            return { success: true, result, strategyIndex: i + idx };
          }
          return {
            success: false,
            error: "Result too short",
            strategyIndex: i + idx,
          };
        } catch (error) {
          console.warn(`Strategy ${i + idx + 1} failed:`, error.message);
          return {
            success: false,
            error: error.message,
            strategyIndex: i + idx,
          };
        }
      });

      const results = await Promise.all(promises);

      const successfulResult = results.find((r) => r.success);
      if (successfulResult) {
        this.lastIframeCookies = successfulResult.cookies || null;
        return successfulResult.result;
      }
    }

    throw new CustomError("All iframe fetching strategies failed", 503);
  }

  async scrapeIframe(id, episodeId, url) {
    if (!url) {
      throw new CustomError("URL is required", 400);
    }

    const htmlResult = await this.fetchIframeHtml(id, episodeId, url);

    const PlayModel = require("../models/playModel");
    return PlayModel.extractSources(htmlResult, url);
  }

  async scrapeDownloadLinks(url) {
    if (!url) {
      throw new CustomError("URL is required", 400);
    }

    const resolvedUrl = await this.extractKwikUrl(url);
    if (!resolvedUrl) {
      // If can't extract the URL, try the original URL
      const downloadUrl = await this.getKwikDownloadUrl(url);
      return { downloadUrl, type: "direct_download" };
    }

    console.log("Found Kwik URL:", resolvedUrl);

    // Use the extracted URL for getting the download link
    const downloadUrl = await this.getKwikDownloadUrl(resolvedUrl);
    return {
      downloadUrl,
      type: "redirected_download",
      originalUrl: url,
      resolvedUrl,
    };
  }

  async extractKwikUrl(url) {
    try {
      console.log("[Step 1] Fetching page to extract Kwik URL:", url);

      const response = await RequestManager.cloudscraperGet(url, {
        headers: {
          Referer: "https://animepahe.pw/",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        timeout: 30000,
      });

      console.log("Page fetched for extraction, status:", response.statusCode);

      const body = response.body;

      const redirectPattern = /href\s*:\s*["']([^"']+)["']/i;
      const redirectMatch = body.match(redirectPattern);
      if (
        redirectMatch &&
        redirectMatch[1] &&
        redirectMatch[1].includes(Config.iframeBaseUrl)
      ) {
        console.log("Found redirect URL:", redirectMatch[1]);
        return redirectMatch[1];
      }

      // Dynamic regex for script pattern
      // Original: /href["']\s*,\s*["']([^"']+\.(?:kwik\.cx|kwikcx))[^"']*["']/i
      const inputDomain = Config.iframeBaseUrl.replace(".", "\\."); // escape dot
      const scriptPattern = new RegExp(
        `href["']\\s*,\\s*["']([^"']+\\.(?:${inputDomain}|${inputDomain.replace("\\.", "")}))[^"']*["']`,
        "i",
      );
      const scriptMatch = body.match(scriptPattern);
      if (scriptMatch && scriptMatch[1]) {
        let kwikUrl = scriptMatch[1];
        if (kwikUrl.startsWith("/")) {
          const urlObj = new URL(url);
          kwikUrl = urlObj.protocol + "//" + urlObj.host + kwikUrl;
        } else if (!kwikUrl.startsWith("http")) {
          kwikUrl = `https://${Config.iframeBaseUrl}${kwikUrl}`;
        }
        console.log("Found Kwik URL from script:", kwikUrl);
        return kwikUrl;
      }

      // Pattern 3: Look for kwik.cx URLs in href attributes
      // inputDomain already defined above
      const hrefPattern = new RegExp(
        `href\\s*=\\s*["']([^"']*\\b${inputDomain}\\b[^"']*)["']`,
        "gi",
      );
      const hrefMatches = [...body.matchAll(hrefPattern)];
      if (hrefMatches.length > 0) {
        // Return the first kwik URL found
        let kwikUrl = hrefMatches[0][1];
        if (kwikUrl.startsWith("/")) {
          const urlObj = new URL(url);
          kwikUrl = urlObj.protocol + "//" + urlObj.host + kwikUrl;
        }
        console.log("Found Kwik URL from href:", kwikUrl);
        return kwikUrl;
      }

      // Pattern 4: Look for kwik.cx URLs in JavaScript redirects
      const jsRedirectPattern = new RegExp(
        `["'](https?:\\/\\/[^"']*${inputDomain}[^"']*)["']`,
        "i",
      );
      const jsMatch = body.match(jsRedirectPattern);
      if (jsMatch && jsMatch[1]) {
        console.log("Found Kwik URL from JavaScript:", jsMatch[1]);
        return jsMatch[1];
      }

      // Pattern 5: Look for the specific script pattern you mentioned
      const specificPattern = new RegExp(
        `href"\\s*,\\s*"([^"]*${inputDomain}[^"]*)"`,
      );
      const specificMatch = body.match(specificPattern);
      if (specificMatch && specificMatch[1]) {
        console.log("Found Kwik URL from specific pattern:", specificMatch[1]);
        return specificMatch[1];
      }

      console.log("No Kwik URL found in the HTML content");
      return null;
    } catch (error) {
      console.error("Error extracting Kwik URL:", error.message);
      return null;
    }
  }

  async getKwikDownloadUrl(url) {
    console.log("[Step 2] Fetching page for download link:", url);

    const getResponse = await RequestManager.cloudscraperGet(url, {
      headers: {
        Referer: "https://animepahe.pw/",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      timeout: 30000,
    });

    console.log("Page fetched, status:", getResponse.statusCode);

    // Extract cookies
    const setCookieHeaders = getResponse.headers["set-cookie"] || [];
    const cookies = setCookieHeaders
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    console.log("[Cookies]:", cookies);

    const body = getResponse.body;
    const scripts = [
      ...body.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi),
    ].map((m) => m[1]);

    let foundAction = null;
    let foundToken = null;

    // JavaScript execution environment
    const dom = new JSDOM(
      "<!doctype html><body><div class='adSense'></div><div class='adSense'></div></body>",
    );
    const { window } = dom;
    const { document } = window;

    const $ = (sel) => {
      if (typeof sel === "function") {
        try {
          sel.call(window);
        } catch (e) {}
        return $;
      }
      if (typeof sel !== "string")
        return {
          html: () => "",
          attr: () => "",
          click: () => $,
          on: () => $,
          remove: () => $,
          length: 0,
        };

      let els = [];
      const eqMatch = sel.match(/^(.+):eq\((\d+)\)$/);
      if (eqMatch) {
        const all = document.querySelectorAll(eqMatch[1]);
        els = all[parseInt(eqMatch[2])] ? [all[parseInt(eqMatch[2])]] : [];
      } else {
        try {
          els = Array.from(document.querySelectorAll(sel));
        } catch (e) {}
      }

      const el = els[0];
      return {
        html: (v) => {
          if (v !== undefined) {
            const htmlStr = String(v);
            const actionMatch = htmlStr.match(/action=["']([^"']+)["']/i);
            if (actionMatch) foundAction = actionMatch[1];
            const tokenMatch = htmlStr.match(
              /name=["']_token["'][^>]*value=["']([^"']+)["']/i,
            );
            if (tokenMatch) foundToken = tokenMatch[1];
            if (el) el.innerHTML = htmlStr;
            return $;
          }
          return el?.innerHTML || "";
        },
        attr: (n, v) =>
          v !== undefined
            ? (el?.setAttribute(n, v), $)
            : el?.getAttribute(n) || "",
        click: (fn) => {
          if (typeof fn === "function")
            try {
              fn.call(el);
            } catch (e) {}
          return $;
        },
        on: () => $,
        remove: () => {
          el?.remove();
          return $;
        },
        length: els.length,
      };
    };
    $.ajax = () => {};

    const sandbox = {
      window,
      document,
      console,
      navigator: { userAgent: "Mozilla/5.0" },
      MutationObserver: class {
        observe() {}
      },
      XMLHttpRequest: function () {
        this.open = this.send = this.setRequestHeader = () => {};
      },
      fetch: async () => ({
        ok: true,
        text: async () => "",
        json: async () => ({}),
      }),
      atob: (s) => Buffer.from(s, "base64").toString("binary"),
      btoa: (s) => Buffer.from(s, "binary").toString("base64"),
      $,
      setTimeout,
      clearTimeout,
    };

    for (const s of scripts) {
      if (s && s.length > 100) {
        try {
          vm.runInNewContext(s, sandbox, { timeout: 4000 });
          if (foundAction && foundToken) break;
        } catch (e) {}
      }
    }

    if (!foundAction || !foundToken) {
      throw new Error("⌠ Could not extract form action or token");
    }

    console.log("[Step 3] Extracted action:", foundAction);
    console.log("[Step 3] Extracted token:", foundToken);

    // Wait a bit to simulate human behavior
    console.log("[Step 4] Waiting 2 seconds...");
    await sleep(2000);

    // Step 3: Submit POST request
    console.log("[Step 5] Submitting POST request...");

    const isServerless =
      process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME;

    try {
      // Use unified RequestManager for POST - works on both serverless and local!
      const postResponse = await RequestManager.cloudscraperPost(
        foundAction,
        { _token: foundToken },
        {
          json: false, // Use form encoding
          headers: {
            Origin: `https://${Config.iframeBaseUrl}`,
            Referer: url,
            Cookie: cookies,
          },
          followRedirect: false,
          followAllRedirects: false,
          timeout: 30000,
        },
      );

      console.log("[Step 6] Response status:", postResponse.statusCode);

      // Handle redirect responses
      if (postResponse.statusCode === 302 || postResponse.statusCode === 301) {
        const downloadUrl =
          postResponse.location || postResponse.headers.location;
        console.log("Final download URL:", downloadUrl);
        return downloadUrl;
      }

      if (postResponse.statusCode === 200) {
        const body = postResponse.body;

        const metaMatch = body.match(
          /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"]*url=([^"']+)["']/i,
        );
        if (metaMatch) {
          console.log("Found meta refresh URL:", metaMatch[1]);
          return metaMatch[1];
        }

        const jsMatch = body.match(
          /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
        );
        if (jsMatch) {
          console.log("Found JavaScript redirect URL:", jsMatch[1]);
          return jsMatch[1];
        }

        console.log("[Response body snippet]:", body.substring(0, 800));
      }
    } catch (error) {
      console.log("[Request Error]:", error.message);

      // Even errors might contain redirect info
      if (error.statusCode === 302 || error.statusCode === 301) {
        const downloadUrl = error.response?.headers?.location;
        if (downloadUrl) {
          console.log("Final download URL (from error):", downloadUrl);
          return downloadUrl;
        }
      }
      throw error;
    }

    throw new Error("✗ Could not extract download URL");
  }

  async extractCloudflareSessionCookies(context) {
    try {
      const cookies = await context.cookies();
      const relevantCookies = cookies.filter(
        (cookie) =>
          cookie.name.includes("cf_clearance") ||
          cookie.name.includes("srvs") ||
          cookie.name.includes("__cf") ||
          cookie.name.includes("_cflb") ||
          cookie.domain.includes("kwik.si") ||
          cookie.domain.includes(".si") ||
          cookie.domain.includes("uwucdn.top") ||
          cookie.domain.includes("uWuCdn"),
      );

      if (relevantCookies.length > 0) {
        const cookieHeader = relevantCookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; ");

        console.log(
          "Extracted Cloudflare session cookies:",
          relevantCookies.map((c) => c.name).join(", "),
        );

        this.cloudflareSessionCookies = {
          header: cookieHeader,
          cookies: relevantCookies,
          timestamp: Date.now(),
        };

        return cookieHeader;
      }
    } catch (error) {
      console.error("Failed to extract cookies:", error.message);
    }
    return null;
  }

  /**
   * STRATEGY 2 — Fast iframe fetch via cloudscraper (no browser).
   *
   * WHY THIS EXISTS:
   * Previously, every iframe (kwik.cx/e/...) launched a full Chromium browser,
   * waited for Cloudflare IUAM to solve, then extracted HTML.
   * Total per iframe: ~13-26s. For 3 resolutions (360p, 720p, 1080p): ~39-78s.
   *
   * This method uses cloudscraper which programmatically solves Cloudflare's
   * "I'm Under Attack Mode" challenge without a browser.
   * Total per iframe: ~1-3s. For 3 resolutions: ~3-9s.
   *
   * FALLBACK: If cloudscraper can't solve the challenge (e.g., newer CF version),
   * it returns challenge HTML. The caller (scrapeIframeLight) detects this
   * and falls back to Playwright.
   *
   * @param {string} url - Kwik iframe URL (e.g., https://kwik.cx/e/abc123)
   * @returns {Promise<string>} iframe HTML
   */
  async scrapeIframeCloudscraper(url) {
    // Check module-level cache first (6-hour TTL)
    const cached = IFRAME_CACHE.get(url);
    if (cached && Date.now() - cached.timestamp < IFRAME_CACHE_TTL) {
      console.log(`[Kwik Fetch] ✅ Cache hit via cloudscraper (${url.substring(0, 50)}...)`);
      return cached.html;
    }

    try {
      console.log(
        `[Kwik Fetch] Using cloudscraper for: ${url.substring(0, 60)}...`,
      );

      const response = await RequestManager.cloudscraperGet(url, {
        headers: {
          Cookie: Config.cookies,
          Referer: "https://animepahe.pw/",
        },
        timeout: 10000,
      });

      const html = response.body;

      if (
        html &&
        html.length > 100 &&
        !html.toLowerCase().includes("just a moment") &&
        !html.toLowerCase().includes("checking your browser") &&
        !html.toLowerCase().includes("ddos protection by cloudflare")
      ) {
        console.log(`[Kwik Fetch] ✅ cloudscraper success (${html.length} bytes)`);
        IFRAME_CACHE.set(url, { html, timestamp: Date.now() });
        if (response.headers) {
          const setCookie = response.headers['set-cookie'];
          if (setCookie) {
            const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
            const cookieData = cookieStr.split('; ')[0];
            if (cookieData) {
              this.cdnCookies = cookieData;
              console.log(`[Kwik Fetch] CDN cookies captured`);
            }
          }
        }
        return html;
      }

      // Response is a CF challenge page — cloudscraper couldn't solve it
      throw new Error("Cloudscraper returned CF challenge page — needs Playwright fallback");
    } catch (error) {
      console.warn(`[Kwik Fetch] ❌ cloudscraper failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * FALLBACK: Iframe fetch via Playwright (full browser).
   *
   * ROLE: This is the second strategy for iframe fetching. It's called only when
   * cloudscraper (scrapeIframeCloudscraper) fails to solve the Cloudflare challenge.
   *
   * WHY IT EXISTS: cloudscraper solves CF IUAM programmatically, but if CF updates
   * their challenge or the page uses additional JS rendering, cloudscraper returns
   * the challenge page HTML. Playwright with a real Chromium instance can handle
   * any challenge, at the cost of ~13-26s per iframe.
   *
   * @param {string} url - Kwik iframe URL
   * @returns {Promise<string>} iframe HTML
   */
  async scrapeIframeLight(url) {
    // Check module-level cache first (6-hour TTL)
    const cached = IFRAME_CACHE.get(url);
    if (cached && Date.now() - cached.timestamp < IFRAME_CACHE_TTL) {
      console.log(`[Kwik Fetch] ✅ Cache hit (fallback path) (${url.substring(0, 50)}...)`);
      return cached.html;
    }

    return browserLimit(async () => {
    const GLOBAL_TIMEOUT = 30000; // 30s total for entire browser operation
    let browser = null;

    try {
      console.log(
        `[Kwik Fetch] Fallback: Playwright for: ${url.substring(0, 60)}...`,
      );

      browser = await Promise.race([
        launchBrowser(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Browser launch timed out")), 10000)),
      ]);

      const page = await browser.newPage();

      // Set a hard timeout for the entire operation
      const result = await Promise.race([
        (async () => {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });

          // Wait for CF challenge to solve (usually 2-3s)
          await page.waitForTimeout(3000);

          const html = await page.content();
          return html;
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Page navigation timed out")), GLOBAL_TIMEOUT)),
      ]);

      const html = result;

      if (
        html &&
        html.length > 100 &&
        !html.toLowerCase().includes("just a moment") &&
        !html.toLowerCase().includes("checking your browser")
      ) {
        console.log(`[Kwik Fetch] ✅ Playwright fallback success (${html.length} bytes)`);
        // Cache the result (module-level)
        IFRAME_CACHE.set(url, { html, timestamp: Date.now() });
        return html;
      }

      throw new Error("Response blocked or invalid");
    } catch (error) {
      console.warn(`[Kwik Fetch] ❌ Playwright fallback failed: ${error.message}`);
      throw error;
    } finally {
      // Always close the browser, even if an error occurred
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
    });
  }

  async getData(type, params, preferFetch = true) {
    try {
      if (preferFetch) {
        switch (type) {
          case "airing":
            return await this.fetchAiringData(params.page || 1);
          case "search":
            return await this.fetchSearchData(params.query, params.page);
          case "queue":
            return await this.fetchQueueData();
          case "releases":
            return await this.fetchAnimeRelease(
              params.animeId,
              params.sort,
              params.page,
            );
        }
      } else {
        switch (type) {
          case "animeList":
            return await this.scrapeAnimeList(
              params.page,
              params.tab,
              params.genre,
            );
          case "animeInfo":
            return await this.scrapeAnimeInfo(params.animeId);
          case "play":
            return await this.scrapePlayPage(params.id, params.episodeId);
          case "iframe":
            return await this.scrapeIframe(
              params.id,
              params.episodeId,
              params.url,
            );
          case "download":
            return await this.scrapeDownloadLinks(params.url);
        }
      }

      throw new CustomError(`Unsupported data type: ${type}`, 400);
    } catch (error) {
      if (error instanceof CustomError) throw error;

      if (error.response?.status) {
        throw new CustomError(
          error.message || "Request failed",
          error.response.status,
        );
      }

      if (preferFetch) {
        return this.getData(type, params, false);
      }

      throw new CustomError(error.message || "Failed to get data", 503);
    }
  }
  
  getCdnCookies() {
    return this.cdnCookies || this.lastIframeCookies || null;
  }
}

module.exports = new Animepahe();
