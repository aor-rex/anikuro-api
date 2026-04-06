const app = require("express")();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const requestId = require("./middleware/requestIdMiddleware");
const ApiKey = require("./middleware/apiKeyMiddleware");
const mangaRouter = require("./routes/mangaRouter");
const mangaListRouter = require("./routes/mangaListRouter");
const mangaSearch = require("./routes/mangaSearch");
require("dotenv").config();

// FIX Bug #48: Request ID middleware (first for correlation)
app.use(requestId);

// Middleware
app.use(cors());
app.use(bodyParser.json());
// app.use(ApiKey); // Disabled for public access

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    // Only log errors and slow requests in production
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

// Routes — all manga endpoints under /api/manga/*
// Routes — order matters! Specific routes MUST come before catch-all :id
app.use("/api/manga/list", mangaListRouter); // /api/manga/list
app.use("/api/manga/search", mangaSearch); // /api/manga/search/:query
app.use("/api/manga", mangaRouter); // /api/manga/:id, /api/manga/:id/:ch

// Serve built Astro docs at / (no API key required)
const docsPath = path.join(__dirname, "..", "docs", "dist");
app.use(
  "/",
  require("express").static(docsPath, {
    maxAge: "1d",
    index: "index.html",
  }),
);

// Health check (bypasses API key)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    docs: "/docs",
  });
});

// FIX Bug #12: 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${req.id}] Unhandled error:`, err.message);
  // Don't leak stack traces to clients in production
  const response = { error: "Internal server error" };
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }
  res.status(500).json(response);
});

// FIX Bug #1: Graceful shutdown for uncaught exceptions
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
  // Give in-flight requests a moment to complete
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown on SIGTERM
process.on("SIGTERM", () => {
  console.log("[SHUTDOWN] SIGTERM received, draining connections...");
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} [PID: ${process.pid}]`);
});
