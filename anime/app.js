const express = require("express");
const axios = require("axios");
const Config = require("./utils/config");
const homeRoutes = require("./routes/homeRoutes");
const queueRoutes = require("./routes/queueRoutes");
const animeListRoutes = require("./routes/animeListRoutes");
const animeInfoRoutes = require("./routes/animeInfoRoutes");
const playRoutes = require("./routes/playRoutes");
const PlayController = require("./controllers/playController");
const cache = require("./middleware/cache");
const Animepahe = require("./scrapers/animepahe");
const flaresolverr = require("./utils/flaresolverr");
const { startWebhookNotifier, runTick } = require("./utils/webhookNotifier");

// Load environment variables into Config
try {
  Config.validate();
  Config.loadFromEnv();
  console.log("\x1b[36m%s\x1b[0m", "Anime configuration loaded.");
} catch (error) {
  console.error("Anime config error:", error.message);
}

// ─── S1+S4: Pre-fetch cookies and solve DDoS-Guard at startup ───
// This launches a browser ONCE, solves the DDoS-Guard challenge,
// saves cookies to disk, and keeps the browser alive for fallback.
// All subsequent requests will use axios + saved cookies (~1-2s)
// instead of launching a new browser per request (~40-60s).
//
// This is non-blocking — the server starts immediately and cookies
// are ready in the background. If pre-fetch fails, requests fall back
// to Playwright automatically.
console.log("\x1b[36m%s\x1b[0m", "Starting cookie pre-fetch (non-blocking)...");
if (!flaresolverr.isEnabled()) {
  console.warn(
    "[anime] FlareSolverr is not enabled. Browser cookie fallback is disabled for this deployment.",
  );
}
Animepahe.initialize().catch((err) =>
  console.error("[Startup] Cookie pre-fetch error:", err.message),
);
startWebhookNotifier();

// ─── Image proxy endpoint ───
// Uses Cloudflare cookies (extracted at startup via FlareSolverr) to
// fetch animepahe.pw images and serve them to the client, bypassing
// Cloudflare Turnstile that would block direct browser requests.
async function proxyImage(req, res) {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }
  if (
    !imageUrl.includes("animepahe.pw") &&
    !imageUrl.includes("kwik") &&
    !imageUrl.includes("pahe")
  ) {
    return res.status(403).json({ error: "Domain not allowed" });
  }

  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch (_) {
    return res.status(400).json({ error: "Invalid image URL" });
  }

  const cookieCandidates = [
    Animepahe.getCdnCookies(),
    Config.cookies,
  ].filter(Boolean);

  if (flaresolverr.isEnabled()) {
    try {
      const solvedCookies = await flaresolverr.fetchCookies(imageUrl);
      if (solvedCookies) cookieCandidates.unshift(solvedCookies);
    } catch (err) {
      console.warn(`[image-proxy] flaresolverr cookie fetch failed: ${err.message}`);
    }
  }

  const headerProfiles = [
    { Referer: "https://animepahe.pw/" },
    { Referer: parsed.origin + "/" },
    {},
  ];

  const cookieProfiles = cookieCandidates.length ? cookieCandidates : [null];
  let upstream = null;
  let lastFailure = null;

  for (const cookie of cookieProfiles) {
    for (const profile of headerProfiles) {
      const headers = {
        "User-Agent": Config.userAgent,
        ...profile,
      };
      if (cookie) headers.Cookie = cookie;

      try {
        const candidate = await axios.get(imageUrl, {
          responseType: "stream",
          headers,
          timeout: 15000,
          validateStatus: () => true,
        });

        if (candidate.status < 400) {
          upstream = candidate;
          break;
        }

        const chunks = [];
        for await (const chunk of candidate.data) {
          chunks.push(chunk);
          if (chunks.reduce((n, b) => n + b.length, 0) >= 2048) break;
        }
        const preview = Buffer.concat(chunks).toString("utf8", 0, 2048);
        lastFailure = {
          status: candidate.status,
          preview,
          headers,
          contentType: candidate.headers["content-type"] || "",
        };
        console.warn(`[image-proxy] blocked with status=${candidate.status} host=${parsed.hostname} referer=${headers.Referer || "-"} cookie=${cookie ? "yes" : "no"}`);
      } catch (err) {
        lastFailure = {
          status: 0,
          preview: err.message,
          headers,
          contentType: "",
        };
        console.warn(`[image-proxy] request failed host=${parsed.hostname} referer=${headers.Referer || "-"} cookie=${cookie ? "yes" : "no"} err=${err.message}`);
      }
    }
    if (upstream) break;
  }

  if (!upstream) {
    const preview = String(lastFailure?.preview || "").slice(0, 160).replace(/\s+/g, " ");
    console.error(`[image-proxy] upstream blocked: status=${lastFailure?.status || 0} host=${parsed.hostname} ctype=${lastFailure?.contentType || "-"} preview=${preview}`);
    return res.status(502).json({ error: "Failed to fetch image" });
  }

  for (const [key, val] of Object.entries(upstream.headers)) {
    if (key !== "transfer-encoding" && key !== "connection") {
      res.setHeader(key, val);
    }
  }
  return upstream.data.pipe(res);
}

const router = express.Router();

// Image proxy — no cache because images change
router.get("/image", proxyImage);

router.get("/download-proxy", PlayController.proxyDownload);
router.post("/webhook-check", express.json(), async (req, res) => {
  const expected = process.env.WEBHOOK_SECRET || "";
  const provided = req.headers["x-webhook-secret"] || "";

  if (expected && provided !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const animeSession = String(req.body?.anime_session || "").trim() || null;
    const result = await runTick({ animeSession });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message || "webhook-check failed" });
  }
});

// ─── Anime routes ───
// NOTE: animeInfoRoutes (/:id, /:id/releases) MUST come before playRoutes (/:id/:ep)
// so that /:id/releases is matched before /:id/:ep treats "releases" as an episode ID.
router.use("", homeRoutes);
router.use("", cache(30), queueRoutes); // 30 seconds
router.use("", cache(18000), animeListRoutes); // 5 hours
router.use("", cache(86400), animeInfoRoutes); // 1 day
router.use("", cache(3600), playRoutes); // 1 hour

module.exports = router;
