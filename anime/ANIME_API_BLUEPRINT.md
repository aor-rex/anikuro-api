# Anime API Compatibility Blueprint

This document outlines how to integrate the existing `pahe-api` into the `anikuro-api` project **without restructuring or removing any functionality**.

## Strategy: Unified Mount (Approach B)

The `pahe-api` codebase stays **100% intact** — controllers, models, routes, scrapers, utils, and Playwright Cloudflare bypass are all preserved. The only change is how it's exported and mounted inside `anikuro-api`.

Source: [animepahe.pw](https://animepahe.pw)

---

## 1. Directory Structure

Copy the entire `pahe-api` into `anikuro-api/anime/` as-is:

```text
anikuro-api/
├── manga/                     # Existing manga API (untouched)
├── anime/                     # pahe-api copied here (internals untouched)
│   ├── app.js                 # Modified: export app, do NOT listen
│   ├── index.js               # Library entry point (unchanged)
│   ├── controllers/           # All 6 controllers (unchanged)
│   ├── models/                # All 5 models (unchanged)
│   ├── routes/                # All 6 route files (unchanged)
│   ├── scrapers/
│   │   └── animepahe.js       # Playwright Cloudflare bypass (unchanged)
│   ├── middleware/            # cache, errorHandler, rateLimiter (unchanged)
│   ├── utils/                 # All 7 utilities (unchanged)
│   ├── package.json           # Kept as-is (own dependencies)
│   └── .env.example
├── Dockerfile                 # Modified: build + copy both
└── app.js                     # NEW root entry (mounts both)
```

---

## 2. Current pahe-api Routes (Verified from Route Files)

These are the **actual** routes registered by each route file, and their final URLs after `app.use('/api', router)` in app.js:

| Route File           | Path Registered        | app.js Mount | Final URL (Standalone)              |
| -------------------- | ---------------------- | ------------ | ----------------------------------- |
| `homeRoutes.js`      | `/airing`              | `/api`       | `GET /api/airing`                   |
| `homeRoutes.js`      | `/search`              | `/api`       | `GET /api/search?q=`                |
| `animeListRoutes.js` | `/anime`               | `/api`       | `GET /api/anime`                    |
| `animeListRoutes.js` | `/anime/:tag1/:tag2`   | `/api`       | `GET /api/anime/:tag1/:tag2`        |
| `animeInfoRoutes.js` | `/:id`                 | `/api`       | `GET /api/:id`                      |
| `animeInfoRoutes.js` | `/:id/releases`        | `/api`       | `GET /api/:id/releases`             |
| `playRoutes.js`      | `/play/:id`            | `/api`       | `GET /api/play/:id?episodeId=`      |
| `playRoutes.js`      | `/play/download-links` | `/api`       | `GET /api/play/download-links?url=` |
| `queueRoutes.js`     | `/queue`               | `/api`       | `GET /api/queue`                    |
| `testRoutes.js`      | `/kwik-test`           | `/api`       | `GET /api/kwik-test`                |
| `testRoutes.js`      | `/downlod-test`        | `/api`       | `GET /api/downlod-test`             |
| `testRoutes.js`      | `/test`                | `/api`       | `GET /api/test`                     |

---

## 3. Target Route Table After Integration

| Method | Route                                       | Description                        | Manga Equivalent                         |
| ------ | ------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| `GET`  | `/api/anime/airing`                         | Currently airing anime             | —                                        |
| `GET`  | `/api/anime/search?q=`                      | Search anime                       | `/api/manga/search/:query`               |
| `GET`  | `/api/anime/list`                           | Browse A-Z                         | `/api/manga/list`                        |
| `GET`  | `/api/anime/list?page=2&tab=A&genre=action` | Filters                            | `/api/manga/list?category=action&page=2` |
| `GET`  | `/api/anime/:id`                            | Anime details                      | `/api/manga/:id`                         |
| `GET`  | `/api/anime/:id/releases`                   | Episode list                       | —                                        |
| `GET`  | `/api/anime/:id/:ep`                        | Stream + download links            | `/api/manga/:id/:ch`                     |
| `GET`  | `/api/anime/download-links?url=`            | Single download link ⚠️ DEPRECATED | —                                        |
| `GET`  | `/api/anime/queue`                          | Queue/upcoming                     | —                                        |
| `GET`  | `/api/anime/kwik-test`                      | Test kwik                          | —                                        |
| `GET`  | `/api/anime/downlod-test`                   | Test download                      | —                                        |
| `GET`  | `/api/anime/test`                           | General test                       | —                                        |

### What Changes From Current → Target

| Current Route                   | Target Route                     | What Needs Changing                                                                   |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| `/api/anime`                    | `/api/anime/list`                | Route file: `/anime` → `/list`                                                        |
| `/api/anime/:tag1/:tag2`        | `/api/anime/list/:tag1/:tag2`    | Route file: `/anime/:tag1/:tag2` → `/list/:tag1/:tag2`                                |
| `/api/play/:id?episodeId=`      | `/api/anime/:id/:ep`             | Route: `/play/:id` → `/:id/:ep` + controller: `req.query.episodeId` → `req.params.ep` |
| `/api/play/download-links?url=` | `/api/anime/download-links?url=` | Route: `/play/download-links` → `/download-links`                                     |

### Routes That Stay the Same (Just mount prefix change)

| Route File           | Current Path    | Target Path     | Change Needed? |
| -------------------- | --------------- | --------------- | -------------- |
| `homeRoutes.js`      | `/airing`       | `/airing`       | No             |
| `homeRoutes.js`      | `/search`       | `/search`       | No             |
| `animeInfoRoutes.js` | `/:id`          | `/:id`          | No             |
| `animeInfoRoutes.js` | `/:id/releases` | `/:id/releases` | No             |
| `queueRoutes.js`     | `/queue`        | `/queue`        | No             |
| `testRoutes.js`      | `/kwik-test`    | `/kwik-test`    | No             |
| `testRoutes.js`      | `/downlod-test` | `/downlod-test` | No             |
| `testRoutes.js`      | `/test`         | `/test`         | No             |

### Routes That Need Changes

| Route File           | Current Path           | Target Path         |
| -------------------- | ---------------------- | ------------------- |
| `animeListRoutes.js` | `/anime`               | `/list`             |
| `animeListRoutes.js` | `/anime/:tag1/:tag2`   | `/list/:tag1/:tag2` |
| `playRoutes.js`      | `/play/:id`            | `/:id/:ep`          |
| `playRoutes.js`      | `/play/download-links` | `/download-links`   |

### Controller Changes

| Controller          | Current               | Target          |
| ------------------- | --------------------- | --------------- |
| `playController.js` | `req.query.episodeId` | `req.params.ep` |

---

## 4. After Mounting in anikuro-api

### The Problem

Parent app mounts anime at `/api/anime`:

```js
app.use("/api/anime", animeApp);
```

But anime's `app.js` mounts routers at `/api`:

```js
app.use("/api", homeRoutes);
```

Result: `/api/anime` + `/api/airing` = **`/api/anime/api/airing`** ❌

### The Fix

Change all `app.use('/api', ...)` to `app.use('', ...)` in anime's `app.js`.

**Before:**

```js
app.use("/api", testRoutes);
app.use("/api", homeRoutes);
app.use("/api", cache(30), queueRoutes);
app.use("/api", cache(18000), animeListRoutes);
app.use("/api", cache(86400), animeInfoRoutes);
app.use("/api", cache(3600), playRoutes);
```

**After:**

```js
app.use("", testRoutes);
app.use("", homeRoutes);
app.use("", cache(30), queueRoutes);
app.use("", cache(18000), animeListRoutes);
app.use("", cache(86400), animeInfoRoutes);
app.use("", cache(3600), playRoutes);
```

Then parent mounts at `/api/anime` → paths concatenate cleanly.

### Route Collision Check

| Manga Route                | Anime Route            | Collision?               |
| -------------------------- | ---------------------- | ------------------------ |
| `/api/manga/list`          | `/api/anime/airing`    | ✅ No                    |
| `/api/manga/list`          | `/api/anime/list`      | ✅ No (different prefix) |
| `/api/manga/search/:query` | `/api/anime/search?q=` | ✅ No                    |
| `/api/manga/:id`           | `/api/anime/:id`       | ✅ No                    |
| `/api/manga/:id/:ch`       | `/api/anime/:id/:ep`   | ✅ No                    |

No collisions.

---

## 5. Filter Parameter Mapping

| Feature          | Param           | Example                 |
| ---------------- | --------------- | ----------------------- |
| Pagination       | `?page=`        | `?page=2`               |
| Letter filter    | `?tab=`         | `?tab=A`                |
| Genre filter     | `?genre=`       | `?genre=action`         |
| Search query     | `?q=`           | `?q=Naruto`             |
| Episode ID       | `req.params.ep` | `/:id/:ep` (path param) |
| Sort order       | `?sort=`        | `?sort=episode_desc`    |
| Downloads toggle | `?downloads=`   | `?downloads=false`      |
| Tag filters      | path params     | `/list/:tag1/:tag2`     |

---

## 6. Changes Required

### `anime/app.js`

**Change 1:** Replace all mount prefixes from `/api` to `''`:

```js
// BEFORE
app.use("/api", testRoutes);
app.use("/api", homeRoutes);
app.use("/api", cache(30), queueRoutes);
app.use("/api", cache(18000), animeListRoutes);
app.use("/api", cache(86400), animeInfoRoutes);
app.use("/api", cache(3600), playRoutes);

// AFTER
app.use("", testRoutes);
app.use("", homeRoutes);
app.use("", cache(30), queueRoutes);
app.use("", cache(18000), animeListRoutes);
app.use("", cache(86400), animeInfoRoutes);
app.use("", cache(3600), playRoutes);
```

**Change 2:** Remove `app.listen()`, add export:

```js
// REMOVE
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { ... });

// ADD
module.exports = app;
```

### `routes/animeListRoutes.js`

```js
// BEFORE
router.get("/anime", AnimeListController.getAllAnime);
router.get("/anime/:tag1/:tag2", AnimeListController.getAnimeByTags);

// AFTER
router.get("/list", AnimeListController.getAllAnime);
router.get("/list/:tag1/:tag2", AnimeListController.getAnimeByTags);
```

### `routes/playRoutes.js`

```js
// BEFORE
router.get("/play/download-links", PlayController.getDownloadLinks);
router.get("/play/:id", PlayController.getStreamingLinks);

// AFTER
router.get("/download-links", PlayController.getDownloadLinks);
router.get("/:id/:ep", PlayController.getStreamingLinks);
```

### `controllers/playController.js`

```js
// BEFORE
const { id } = req.params;
const { episodeId, downloads } = req.query;

// AFTER
const { id, ep } = req.params;
const { downloads } = req.query;
```

### Route Files — No Changes Needed

- `homeRoutes.js` — `/airing`, `/search` ✓
- `animeInfoRoutes.js` — `/:id`, `/:id/releases` ✓
- `queueRoutes.js` — `/queue` ✓
- `testRoutes.js` — `/kwik-test`, `/downlod-test`, `/test` ✓

---

## 7. Root Entry Point (New File in anikuro-api)

```javascript
const express = require("express");
const path = require("path");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const mangaApp = require("./manga/app");
const animeApp = require("./anime/app");

const app = express();

// Mount under namespaces
app.use("/api/manga", mangaApp);
app.use("/api/anime", animeApp);

// Serve docs
const docsPath = path.join(__dirname, "docs", "dist");
app.use(
  "/docs",
  express.static(docsPath, { maxAge: "1d", index: "index.html" }),
);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    name: "anikuro-api",
    version: process.env.npm_package_version || "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      docs: "/docs",
      manga_list: "/api/manga/list",
      manga_detail: "/api/manga/:id",
      manga_chapter: "/api/manga/:id/:ch",
      manga_search: "/api/manga/search/:query",
      anime_airing: "/api/anime/airing",
      anime_search: "/api/anime/search",
      anime_list: "/api/anime/list",
      anime_info: "/api/anime/:id",
      anime_releases: "/api/anime/:id/releases",
      anime_play: "/api/anime/:id/:ep",
      anime_downloads: "/api/anime/download-links",
      anime_queue: "/api/anime/queue",
      health: "/health",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} [PID: ${process.pid}]`);
});
```

---

## 8. Dockerfile Integration

```dockerfile
# ============================================
# Stage 1: Build Astro Docs
# ============================================
FROM node:22-alpine AS docs-builder

WORKDIR /app/docs
COPY docs/package.json docs/package-lock.json* ./
RUN npm install --frozen-lockfile
COPY docs/ ./
RUN npm run build

# ============================================
# Stage 2: Build Manga API
# ============================================
FROM node:22-alpine AS manga-builder

WORKDIR /app/manga
COPY manga/package.json manga/package-lock.json* ./
RUN npm install --production --frozen-lockfile

# ============================================
# Stage 3: Build Anime API
# ============================================
FROM node:22-slim AS anime-builder

WORKDIR /app/anime
COPY anime/package.json anime/package-lock.json* ./
RUN npm install --production --frozen-lockfile
RUN npx playwright install chromium

# ============================================
# Stage 4: Runtime
# ============================================
FROM node:22-slim

WORKDIR /app

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy docs
COPY --from=docs-builder /app/docs/dist ./docs/dist

# Copy manga
COPY --from=manga-builder /app/manga/node_modules ./manga/node_modules
COPY manga/ ./manga/

# Copy anime
COPY --from=anime-builder /app/anime/node_modules ./anime/node_modules
COPY anime/ ./anime/

# Install root-level express for unified app.js
RUN npm install express

# Copy root entry
COPY app.js ./app.js

ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "app.js"]
```

**Trade-off:** Image size increases (~300-500MB) due to Playwright + Chromium. Build time increases. This is the cost of keeping the Cloudflare bypass.

---

## 9. Compatibility Checklist

- [ ] `routes/animeListRoutes.js`: `/anime` → `/list`, `/anime/:tag1/:tag2` → `/list/:tag1/:tag2`
- [ ] `routes/playRoutes.js`: `/play/:id` → `/:id/:ep`, `/play/download-links` → `/download-links`
- [ ] `controllers/playController.js`: `req.query.episodeId` → `req.params.ep`
- [ ] `anime/app.js` mount prefix changed from `/api` to `''` (6 lines)
- [ ] `anime/app.js` exports app (no `app.listen`)
- [ ] `NODE_TLS_REJECT_UNAUTHORIZED = "0"` set in root `app.js`
- [ ] Playwright Chromium installed in Docker runtime stage
- [ ] System dependencies for Chromium installed (`libnss3`, `libgbm1`, etc.)
- [ ] `PORT` defaults to `7860` (HF Spaces requirement)
- [ ] CORS enabled (already in pahe-api)
- [ ] JSON responses only (already the case)
- [ ] Error handling (already in pahe-api)
- [ ] Root `app.js` mounts both manga and anime
- [ ] Dockerfile builds both stages + copies both

---

## 10. Known Limitations

1. **Playwright on HF Spaces** — May require `PLAYWRIGHT_BROWSERS_PATH` env var or custom Chromium path
2. **Cookie auto-fetch** — Playwright launches on first request; initial request may be slow
3. **Memory usage** — Running both APIs + Chromium may exceed HF Spaces free tier limits (16GB RAM)
4. **Cold starts** — First request after idle may take 5-15s for Playwright initialization
5. **`/api/anime/download-links` deprecated** — Broken since kwik.cx added Cloudflare protection. Use `sources[].download` from `/api/anime/:id/:ep` instead. Fixable by replacing cloudscraper with Playwright in `extractKwikUrl()` / `getKwikDownloadUrl()`.

---

## 11. Redis Integration Plan (Future)

Redis is **optional**. The API works without it — caching is disabled and rate limiting is off. Add Redis later if you notice slow responses, high upstream request volume, or abuse.

### Why Add Redis Later?

| Feature          | Without Redis                               | With Redis               |
| ---------------- | ------------------------------------------- | ------------------------ |
| Response caching | Disabled — every request scrapes upstream   | Enabled with TTL         |
| Rate limiting    | Disabled even if `RATE_LIMIT_SECRET` is set | Active across instances  |
| Response time    | Slower (always scrapes)                     | Faster (cached hits)     |
| Ban risk         | Higher (more requests to animepahe)         | Lower (cached responses) |

### Cache TTLs (Already Configured in middleware/cache.js)

| Endpoint    | TTL        |
| ----------- | ---------- |
| Queue       | 30 seconds |
| Anime list  | 5 hours    |
| Anime info  | 24 hours   |
| Play/Stream | 1 hour     |

### Step-by-Step Plan

#### Step 1: Create a Free Redis Instance

**Recommended: Upstash** (serverless, free tier)

1. Go to [upstash.com](https://upstash.com) → Create Database
2. Copy the connection URL: `redis://default:PASSWORD@HOST:PORT`

**Alternative: Redis Cloud**

1. Go to [redis.com](https://redis.com/try-free/) → Create free database
2. Copy the connection URL

#### Step 2: Set Environment Variable

On HF Spaces, add the `REDIS_URL` environment variable in your Space Settings:

```
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT
```

#### Step 3: (Optional) Add Rate Limiting

Set these env vars after `REDIS_URL` is configured:

```
RATE_LIMIT_SECRET=<random-uuid-or-string>
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900
```

> **Note:** Rate limiting only activates when BOTH `RATE_LIMIT_SECRET` AND `REDIS_URL` are set.

#### Step 4: Restart the Space

After adding `REDIS_URL`, restart the HF Space. The Redis client in `utils/redis.js` auto-connects on startup:

```js
// utils/redis.js — already in the codebase
const REDIS_ENABLED = !!process.env.REDIS_URL;
// If REDIS_URL is set, caching and rate limiting activate automatically
```

#### Step 5: Verify

Check the HF Space logs for:

```
Redis Client Connected
```

If you see this, caching is active. If not, the API falls back gracefully.

---

## 12. Documentation

Add anime endpoints to `docs/src/content/docs/` in the same MDX format as manga docs so they appear in the sidebar automatically.
