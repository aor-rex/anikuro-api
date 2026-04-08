const express = require("express");
const Config = require("./utils/config");
const homeRoutes = require("./routes/homeRoutes");
const queueRoutes = require("./routes/queueRoutes");
const animeListRoutes = require("./routes/animeListRoutes");
const animeInfoRoutes = require("./routes/animeInfoRoutes");
const playRoutes = require("./routes/playRoutes");
const cache = require("./middleware/cache");

// Load environment variables into Config
try {
  Config.validate();
  Config.loadFromEnv();
  console.log("\x1b[36m%s\x1b[0m", "Anime configuration loaded.");
} catch (error) {
  console.error("Anime config error:", error.message);
}

const router = express.Router();

// ─── Anime routes ───
router.use("", homeRoutes);
router.use("", cache(30), queueRoutes); // 30 seconds
router.use("", cache(18000), animeListRoutes); // 5 hours
router.use("", cache(86400), animeInfoRoutes); // 1 day
router.use("", cache(3600), playRoutes); // 1 hour

module.exports = router;
