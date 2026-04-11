const express = require("express");
const Config = require("./utils/config");
const homeRoutes = require("./routes/homeRoutes");
const queueRoutes = require("./routes/queueRoutes");
const animeListRoutes = require("./routes/animeListRoutes");
const animeInfoRoutes = require("./routes/animeInfoRoutes");
const playRoutes = require("./routes/playRoutes");
const cache = require("./middleware/cache");
const Animepahe = require("./scrapers/animepahe");

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
Animepahe.initialize().catch((err) =>
  console.error("[Startup] Cookie pre-fetch error:", err.message),
);

const router = express.Router();

// ─── Anime routes ───
// NOTE: animeInfoRoutes (/:id, /:id/releases) MUST come before playRoutes (/:id/:ep)
// so that /:id/releases is matched before /:id/:ep treats "releases" as an episode ID.
router.use("", homeRoutes);
router.use("", cache(30), queueRoutes); // 30 seconds
router.use("", cache(18000), animeListRoutes); // 5 hours
router.use("", cache(86400), animeInfoRoutes); // 1 day
router.use("", cache(3600), playRoutes); // 1 hour

module.exports = router;
