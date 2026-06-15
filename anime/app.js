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

  const headers = {
    Referer: "https://animepahe.pw/",
    "User-Agent": Config.userAgent,
  };
  if (Config.cookies) headers.Cookie = Config.cookies;

  try {
    const resp = await axios.get(imageUrl, {
      responseType: "stream",
      headers,
      timeout: 15000,
    });
    for (const [key, val] of Object.entries(resp.headers)) {
      if (key !== "transfer-encoding" && key !== "connection") {
        res.setHeader(key, val);
      }
    }
    return resp.data.pipe(res);
  } catch (err) {
    console.error(`[Image Proxy] Failed: ${imageUrl} — ${err.message}`);
    res.status(502).json({ error: "Failed to fetch image" });
  }
}

const router = express.Router();

// Image proxy — no cache because images change
router.get("/image", proxyImage);

router.get("/download-proxy", PlayController.proxyDownload);

// ─── Anime routes ───
// NOTE: animeInfoRoutes (/:id, /:id/releases) MUST come before playRoutes (/:id/:ep)
// so that /:id/releases is matched before /:id/:ep treats "releases" as an episode ID.
router.use("", homeRoutes);
router.use("", cache(30), queueRoutes); // 30 seconds
router.use("", cache(18000), animeListRoutes); // 5 hours
router.use("", cache(86400), animeInfoRoutes); // 1 day
router.use("", cache(3600), playRoutes); // 1 hour

module.exports = router;
