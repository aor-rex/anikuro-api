// Unified server — mounts both manga and anime APIs
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const requestId = require("../manga/middleware/requestIdMiddleware");

// Add manga node_modules to the module search path
const mangaPath = path.join(__dirname, "..", "manga");
module.paths.unshift(path.join(mangaPath, "node_modules"));

// Add anime node_modules
const animePath = path.join(__dirname, "..", "anime");
module.paths.unshift(path.join(animePath, "node_modules"));
const animeApp = require("../anime/app");
const {
  errorHandler,
  CustomError,
} = require("../anime/middleware/errorHandler");

// ─── Manga imports ───
const mangaRouter = require("../manga/routes/mangaRouter");
const mangaListRouter = require("../manga/routes/mangaListRouter");
const mangaSearch = require("../manga/routes/mangaSearch");

// ─── Disable TLS verification (HF Spaces routing) ───
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();

// ─── Shared middleware ───
app.use(requestId);
app.use(cors());
app.use(bodyParser.json());

// ─── Fix #8: Response compression (gzip/brotli) ───
// Saves 60-80% bandwidth on JSON responses. Critical for HF Spaces bandwidth limits.
const compression = require("compression");
app.use(compression({ threshold: 1024 })); // Only compress responses > 1KB

// ─── Fix #9: Request timeout ───
// Prevents slow requests from holding connections indefinitely.
app.use((req, res, next) => {
  req.setTimeout(90000);
  res.setTimeout(90000);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    if (
      process.env.NODE_ENV !== "production" ||
      status >= 400 ||
      duration > 5000
    ) {
      console.log(
        `[${req.id}] ${req.method} ${req.path} -> ${status} (${duration}ms)`,
      );
    }
  });
  next();
});

// ─── Manga routes (/api/manga/*) ───
// ─── Fix #5: Add response caching to manga endpoints ───
// MangaBuddy content changes slowly. Caching eliminates 90%+ of upstream requests.
const cache = require("../anime/middleware/cache");
app.use("/api/manga/list", cache(300), mangaListRouter);     // 5 min
app.use("/api/manga/search", cache(120), mangaSearch);       // 2 min
app.use("/api/manga", cache(3600), mangaRouter);             // 1 hour — details/chapters rarely change

// ─── Download Proxy (/api/anime/download-proxy?url=...) ───
// DEPRECATED: This endpoint launches a headless browser to bypass Cloudflare.
// It is resource-intensive (300MB+ RAM per request), has a 120s timeout,
// and is not suitable for production use without concurrency limits.
// Use /api/anime/:id/:ep instead — direct m3u8 stream URLs are provided
// under sources[].url and download proxy URLs under sources[].download.
app.get("/api/anime/download-proxy", async (_req, res) => {
  return res.status(501).json({
    status: 501,
    message: "DEPRECATED: This endpoint is deprecated due to heavy resource usage.",
    workaround: "Use /api/anime/:id/:ep instead. m3u8 streams are under sources[].url and download proxies under sources[].download.",
  });
});

// ─── Anime routes (/api/anime/*) ───
// The anime app exports an Express app, mount it as a router
app.use("/api/anime", animeApp);

// ─── Static docs ───
const docsPath = path.join(__dirname, "..", "docs", "dist");
app.use(
  "/docs",
  require("express").static(docsPath, {
    maxAge: "1d",
    index: "index.html",
  }),
);

// ─── Health check ───
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    name: "anikuro api",
    version: require("./package.json").version,
    description: "your anime manga api gateway",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    uptime_human: formatUptime(process.uptime()),
    node_version: process.version,
    platform: process.platform,
    memory_usage: process.memoryUsage(),
    endpoints: {
      docs: "/docs",
      manga_list: "/api/manga/list",
      manga_detail: "/api/manga/:id",
      manga_chapter: "/api/manga/:id/:ch",
      manga_search: "/api/manga/search/:query",
      anime_list: "/api/anime/list",
      anime_search: "/api/anime/search",
      anime_info: "/api/anime/:id",
      anime_episode: "/api/anime/:id/:ep",
      health: "/health",
    },
    source: "https://gitlab.com/aor-rex/anikuro-api",
  });
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let out = "";
  if (d) out += d + "d ";
  if (h) out += h + "h ";
  if (m) out += m + "m ";
  out += s + "s";
  return out.trim();
}

// ─── Root redirect ───
app.get("/", (req, res) => {
  res.redirect("/health");
});

// ─── 404 handler ───
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: req.path });
});

// ─── Global error handler ───
app.use((err, req, res, next) => {
  // Check CustomError.statusCode first, then HTTP response status
  const statusCode = err.statusCode || err.response?.status || 500;
  const message = err.message || "Something went wrong";

  console.error(`[${req.id}] Error: ${message} (${statusCode})`);

  const response = { error: message };
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }
  res.status(statusCode).json(response);
});

// ─── Graceful shutdown ───
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    `[UNHANDLED] Rejection at:`,
    promise,
    "reason:",
    reason?.message || reason,
  );
  // Don't exit — log and keep running
});

process.on("uncaughtException", (error) => {
  console.error(`[FATAL] Uncaught exception:`, error.message, error.stack);
  // Don't exit — log and keep serving requests
  // HF Spaces may auto-restart on crash, but keeping the server alive
  // allows recovery from transient errors.
});

process.on("SIGTERM", () => {
  console.log("[SHUTDOWN] SIGTERM received, draining connections...");
  process.exit(0);
});

const PORT = process.env.PORT || 7860;
const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} [PID: ${process.pid}]`);
});
