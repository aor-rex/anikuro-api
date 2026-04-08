// Unified server — mounts both manga and anime APIs
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const requestId = require("../manga/middleware/requestIdMiddleware");

// ─── Anime imports ───
const animeApp = require("../anime/app");
const { errorHandler, CustomError } = require("../anime/middleware/errorHandler");

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
app.use("/api/manga/list", mangaListRouter);
app.use("/api/manga/search", mangaSearch);
app.use("/api/manga", mangaRouter);

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
    version: process.env.npm_package_version || "1.0.0",
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
    source: "https://github.com/aor-rex/anikuro-api",
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
  console.error(`[${req.id}] Unhandled error:`, err.message);
  const response = { error: "Internal server error" };
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }
  res.status(500).json(response);
});

// ─── Graceful shutdown ───
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    `[UNHANDLED] Rejection at:`,
    promise,
    "reason:",
    reason?.message || reason,
  );
});

process.on("uncaughtException", (error) => {
  console.error(`[FATAL] Uncaught exception:`, error.message);
  setTimeout(() => process.exit(1), 1000);
});

process.on("SIGTERM", () => {
  console.log("[SHUTDOWN] SIGTERM received, draining connections...");
  process.exit(0);
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} [PID: ${process.pid}]`);
});
