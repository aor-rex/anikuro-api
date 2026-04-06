const https = require("https");
const zlib = require("zlib");

const BASE_URL = "https://mangabuddy.com";

// FIX Bug #8: Shared https.Agent - maxSockets actually works now
const sharedAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20, // Support 20 concurrent users
  maxFreeSockets: 10,
  timeout: 30000,
});

// FIX Bug #5: Sec-Fetch headers list
const SEC_FETCH_HEADERS = [
  { dest: "document", mode: "navigate", site: "same-origin", user: "?1" },
  { dest: "document", mode: "navigate", site: "none", user: "?1" },
];

// Stealth headers - mimic real Chrome browser
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomHeaders() {
  const secFetch =
    SEC_FETCH_HEADERS[Math.floor(Math.random() * SEC_FETCH_HEADERS.length)];
  return {
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,en-GB;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": secFetch.dest,
    "Sec-Fetch-Mode": secFetch.mode,
    "Sec-Fetch-Site": secFetch.site,
    "Sec-Fetch-User": secFetch.user,
    "Sec-Ch-Ua":
      '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Cache-Control": "max-age=0",
    Referer: BASE_URL + "/",
  };
}

// Request queue for rate limiting
let lastRequestTime = 0;
const MIN_DELAY = 2000; // Minimum 2s between requests to upstream
const MAX_DELAY = 3500; // Maximum 3.5s

function getRandomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY)) + MIN_DELAY;
}

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const delay = Math.max(0, getRandomDelay() - elapsed);
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

// FIX Bug #6: Redirect tracking without recursion issues
async function scrape(path, redirectCount = 0, attempt = 1) {
  await rateLimit();

  const MAX_REDIRECTS = 5;
  const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB max (was 50MB)
  const MAX_ATTEMPTS = 3; // Retry 503 errors up to 3 times

  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const timeout = 30000;

    const options = {
      headers: getRandomHeaders(),
      timeout: timeout,
      agent: sharedAgent, // FIX Bug #8: Use shared agent
    };

    const req = https.get(url, options, (res) => {
      // Handle redirects
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        if (redirectCount >= MAX_REDIRECTS) {
          res.resume();
          return reject(new Error(`Too many redirects (${MAX_REDIRECTS})`));
        }
        const redirectUrl = res.headers.location;
        const redirectPath = redirectUrl.startsWith("http")
          ? redirectUrl.replace(BASE_URL, "")
          : redirectUrl;
        res.resume(); // Consume redirect response
        return scrape(redirectPath, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }

      // Retry on 503 with backoff
      if (res.statusCode === 503 && attempt < MAX_ATTEMPTS) {
        res.resume();
        console.log(`[scraper] 503 received, retry ${attempt}/${MAX_ATTEMPTS}`);
        return setTimeout(
          () =>
            scrape(path, redirectCount, attempt + 1)
              .then(resolve)
              .catch(reject),
          3000 * attempt, // Exponential backoff: 3s, 6s
        );
      }

      if (res.statusCode >= 400) {
        res.resume();
        return reject(
          new Error(
            `HTTP ${res.statusCode}: ${res.statusMessage || "Unknown"}`,
          ),
        );
      }

      // FIX Bug #4: Stream with size limit instead of unbounded chunk array
      const chunks = [];
      let totalSize = 0;

      res.on("data", (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_RESPONSE_SIZE) {
          req.destroy();
          return reject(
            new Error(
              `Response too large (>${MAX_RESPONSE_SIZE / 1024 / 1024}MB)`,
            ),
          );
        }
        chunks.push(chunk);
      });

      res.on("end", () => {
        try {
          let buffer = Buffer.concat(chunks);
          const encoding = res.headers["content-encoding"];

          // FIX Bug #5: Proper decompression with error handling
          if (encoding === "gzip") {
            try {
              buffer = zlib.gunzipSync(buffer);
            } catch (e) {
              return reject(
                new Error(`gzip decompression failed: ${e.message}`),
              );
            }
          } else if (encoding === "deflate") {
            try {
              buffer = zlib.inflateSync(buffer);
            } catch (e) {
              return reject(
                new Error(`deflate decompression failed: ${e.message}`),
              );
            }
          } else if (encoding === "br") {
            try {
              buffer = zlib.brotliDecompressSync(buffer);
            } catch (e) {
              return reject(
                new Error(`brotli decompression failed: ${e.message}`),
              );
            }
          }

          const html = buffer.toString("utf8");
          resolve(html);
        } catch (error) {
          reject(error);
        }
      });

      res.on("error", reject);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout (30s)"));
    });

    req.on("error", (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
  });
}

module.exports = scrape;
