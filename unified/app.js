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

// ─── Download Proxy (/api/anime/download-proxy?url=...) ───
// Uses Playwright to bypass Cloudflare on CDN and stream file to client
app.get("/api/anime/download-proxy", async (req, res) => {
  const { url } = req.query;

  if (!url || !url.startsWith("https://")) {
    return res.status(400).json({ error: "Valid URL required" });
  }

  const DOWNLOAD_TIMEOUT = 120000; // 120s hard timeout
  let browser = null;

  try {
    console.log(
      `[Download Proxy] Solving Cloudflare for: ${url.substring(0, 80)}...`,
    );
    const start = Date.now();

    const { chromium } = require("playwright");

    // Wrap entire operation with global timeout
    await Promise.race([
      (async () => {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // Navigate to CDN URL (Playwright solves Cloudflare)
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        // Poll for CF challenge completion instead of fixed wait
        try {
          await page.waitForFunction(
            () => {
              return (
                !document.title.toLowerCase().includes("just a moment") &&
                !document.title.toLowerCase().includes("please wait") &&
                !window.location.href.includes("cdn-cgi/challenge")
              );
            },
            { timeout: 30000 },
          );
        } catch {
          console.log("[Download Proxy] CF poll timed out, proceeding anyway");
        }

        // Check if still on CF challenge page
        const currentUrl = page.url();
        if (currentUrl.includes("cdn-cgi/challenge")) {
          return res.status(502).json({
            error: "Cloudflare challenge not solved",
            message: "CDN protection too strong. Try another episode.",
          });
        }

        // Check if we got the actual file (not HTML error page)
        const contentType = await page.evaluate(() => document.contentType);
        if (contentType === "text/html") {
          // Might still be an HTML page with file content or error
          const pageText = await page.evaluate(() => document.body.innerText.substring(0, 200));
          if (pageText.toLowerCase().includes("just a moment") || pageText.toLowerCase().includes("error")) {
            return res.status(502).json({
              error: "Download page returned HTML error",
              message: pageText.substring(0, 200),
            });
          }
        }

        console.log("[Download Proxy] CF solved, streaming file to client...");

        // Get response headers from the navigation
        const headers = response.headers();
        const contentLength = headers["content-length"] || headers["content-length"];

        // Extract filename from Content-Disposition header or URL path
        const contentDisposition = headers["content-disposition"] || "";
        const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        const filename = filenameMatch?.[1] || url.split("/").pop()?.split("?")[0] || "download.mp4";

        // Detect content type from response
        const mimeType = headers["content-type"] || "application/octet-stream";

        // Set response headers
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${decodeURIComponent(filename)}"`);
        if (contentLength) {
          res.setHeader("Content-Length", contentLength);
        }
        res.setHeader("Cache-Control", "public, max-age=3600");

        // Stream the response body directly to client
        const responseBody = await response.body();
        const elapsed = Date.now() - start;
        const sizeMB = (responseBody.length / 1024 / 1024).toFixed(1);
        console.log(
          `[Download Proxy] ✅ Streamed ${sizeMB} MB in ${(elapsed / 1000).toFixed(1)}s`,
        );

        res.end(responseBody);
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Download proxy timed out")), DOWNLOAD_TIMEOUT),
      ),
    ]);
  } catch (error) {
    console.error(`[Download Proxy] Error:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Download failed",
        message: error.message,
      });
    }
  } finally {
    // Always close the browser, even if an error occurred
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
});

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
  // Don't exit — log and keep running
});

process.on("uncaughtException", (error) => {
  console.error(`[FATAL] Uncaught exception:`, error.message, error.stack);
  // Don't exit — log and keep serving requests
  // setTimeout(() => process.exit(1), 1000);
});

process.on("SIGTERM", () => {
  console.log("[SHUTDOWN] SIGTERM received, draining connections...");
  process.exit(0);
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} [PID: ${process.pid}]`);
});
