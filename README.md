---
title: Anikuro API
emoji: 📚
colorFrom: red
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# Anikuro API

A unified REST API gateway for **Anime** and **Manga** — scraping streaming links, episode data, manga details, and chapter images from popular sources.

> **⚠️ Notice:** The hosted instance is for **testing purposes only**. For production use, **host your own instance** to avoid rate limits and IP baError: Error solving the challenge. Timeout after 35.0 seconds.ns.


## Credits & Acknowledgments

Anikuro API is a **fork and unification** of two excellent open-source projects:

| Component | Original Project | Author |
|-----------|-----------------|--------|
| 🎬 **Anime API** | [animepahe-api](https://github.com/ElijahCodes12345/animepahe-api) | [ElijahCodes12345](https://github.com/ElijahCodes12345) |
| 📖 **Manga API** | [mangahook-api](https://github.com/kiraaziz/mangahook-api/) | [kiraaziz](https://github.com/kiraaziz) |

This project merges both into a single Dockerized server with shared middleware, caching, and documentation.

**Special thanks:**
- [Pal-droid](https://github.com/Pal-droid) — assistance with scrapinging logic and feature improvements
- All upstream library developers whose work made this possible

---

## Features

### Anime (via [Animepahe](https://animepahe.pw))
- 🎯 Currently airing anime
- 🔍 Search by title
- 📋 A-Z catalog browse with genre/letter filters
- 📺 Full anime details, relations, recommendations
- 🎬 Streaming links (m3u8 HLS) with multiple resolutions
- 📥 Direct download links with quality/fansub metadata
- 🛡️ Cloudflare DDoS-Guard bypass (cookie pre-fetching)
- 🐋 Redis + disk cache fallback

### Manga (via [MangaBuddy](https://mangabuddy.com))
- 📚 Browse manga by genre, status, page
- 🔍 Search manga by title
- 📖 Manga details with chapter lists
- 🖼️ Chapter image pages
- 🔄 Stealth headers rotation (mimics real Chrome)
- 📦 Shared HTTPS agent with keep-alive

### Shared
- 🚦 Request ID tracing (`X-Request-ID`)
- 📊 Health check endpoint
- 📖 Interactive docs at `/docs`
- 🐋 Single Dockerfile for both services

---

## Quick Start

### Base URL

```
https://aor-rex-anikuro-api.hf.space
```

### Run Locally

```bash
git clone https://github.com/aor-rex/anikuro-api.git
cd anikuro-api

# Install & build
docker build -t anikuro-api .

# Run
docker run -p 7860:7860 anikuro-api
```

Or run without Docker:

```bash
# Install dependencies for all sub-projects
cd unified && npm install && cd ..
cd anime && npm install && npx playwright install && cd ..
cd manga && npm install && cd ..

# Start
cd unified && node app.js
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=7860
NODE_ENV=production

# Anime
BASE_URL=https://animepahe.pw              # Optional
IFRAME_BASE_URL=kwik.cx                    # Optional — video iframe host
USER_AGENT=                                # Optional — custom UA
COOKIES=                                   # Optional — manual DDoS-Guard cookies
USE_PROXY=false                            # Enable proxy for anime scraping
PROXIES=http://proxy1:8080,http://proxy2:8080  # Optional proxy list
REDIS_URL=redis://user:pass@host:port      # Optional — enables Redis caching
ALLOWED_ORIGINS=*                          # CORS origins (comma-separated)
RATE_LIMIT_SECRET=                         # Optional — enables rate limiting
RATE_LIMIT_MAX=100                         # Max requests per window
RATE_LIMIT_WINDOW=900                      # Window in seconds (15 min)

# Manga
API_KEY=your-secret-key                    # Optional — enables API key auth for manga
```

### CORS Configuration

```env
# Allow all origins (default)
ALLOWED_ORIGINS=*

# Single origin
ALLOWED_ORIGINS=http://localhost:5173

# Multiple origins
ALLOWED_ORIGINS=http://localhost:5173,https://myapp.com
```

### Redis Caching

When `REDIS_URL` is set, responses are cached with these defaults:

| Endpoint | TTL |
|----------|-----|
| Anime queue | 30 seconds |
| Anime list | 5 hours |
| Anime info | 24 hours |
| Anime play/episode | 1 hour |

Without Redis, a disk cache at `/tmp/anikuro-cache/` is used automatically.

---

## API Endpoints

All responses are JSON. Errors follow this format:

```json
{
  "status": 503,
  "message": "Request failed"
}
```

---

### 🏥 Health Check

```
GET /health
```

Returns server status, uptime, memory usage, and all available endpoints.

**Response:**
```json
{
  "status": "ok",
  "name": "anikuro api",
  "version": "2.0.0",
  "uptime": 3600,
  "uptime_human": "1h",
  "memory_usage": { "rss": 250000000, "heapUsed": 80000000 },
  "endpoints": { ... }
}
```

---

### 📖 Documentation

```
GET /docs
```

Interactive documentation built with Astro + Starlight, including an API playground.

---

## Manga API

**Source:** [MangaBuddy](https://mangabuddy.com)  
**Prefix:** `/api/manga`

### 1. Browse Manga List

```
GET /api/manga/list
GET /api/manga/list?page=2
GET /api/manga/list?page=1&category=action
GET /api/manga/list?page=1&category=romance&state=ongoing
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `category` | string | `all` | Genre filter (`action`, `romance`, `fantasy`, etc.) |
| `state` | string | `all` | Status filter (`ongoing`, `completed`) |

**Response:**
```json
{
  "mangaList": [
    {
      "id": "solo-leveling",
      "image": "https://mangabuddy.com/covers/solo-leveling.jpg",
      "title": "Solo Leveling",
      "chapter": "Chapter 200",
      "view": "1.2M",
      "description": "10 years ago, the \"Gate\" appeared..."
    }
  ],
  "metaData": {
    "type": [{ "id": "latest", "name": "Latest" }],
    "state": [{ "id": "all", "name": "all" }, { "id": "completed", "name": "Completed" }],
    "category": [{ "id": "action", "name": "Action" }]
  }
}
```

---

### 2. Manga Details & Chapter List

```
GET /api/manga/:id
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `:id` | string | ✅ | Manga slug (e.g., `solo-leveling`) |

**Response:**
```json
{
  "imageUrl": "https://mangabuddy.com/covers/solo-leveling.jpg",
  "name": "Solo Leveling",
  "author": "Chugong",
  "status": "Completed",
  "updated": "Dec 29, 2024",
  "view": "N/A",
  "genres": ["Action", "Adventure", "Fantasy"],
  "chapterList": [
    {
      "id": "chapter-200",
      "path": "/solo-leveling/chapter-200",
      "name": "Chapter 200",
      "view": "N/A",
      "createdAt": "Dec 29, 2024"
    }
  ]
}
```

---

### 3. Chapter Images

```
GET /api/manga/:id/:ch
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `:id` | string | ✅ | Manga slug |
| `:ch` | string | ✅ | Chapter slug (e.g., `chapter-1`) |

**Response:**
```json
{
  "title": "Solo Leveling",
  "currentChapter": "Solo Leveling - Chapter 1",
  "images": [
    {
      "title": "Solo Leveling - Page 1",
      "image": "https://s1.mangabuddy.com/images/solo-leveling/ch1/page1.jpg"
    },
    {
      "title": "Solo Leveling - Page 2",
      "image": "https://s1.mangabuddy.com/images/solo-leveling/ch1/page2.jpg"
    }
  ]
}
```

---

### 4. Search Manga

```
GET /api/manga/search/:query
GET /api/manga/search/solo%20leveling
GET /api/manga/search/naruto?page=2
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `:query` | string | ✅ | Search term (URL-encoded) |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |

**Response:**
```json
{
  "mangaList": [
    {
      "id": "solo-leveling-ragnarok",
      "image": "https://mangabuddy.com/covers/solo-leveling-ragnarok.jpg",
      "title": "Solo Leveling: Ragnarok"
    }
  ],
  "metaData": {
    "totalPages": 3
  }
}
```

---

## Anime API

**Source:** [Animepahe](https://animepahe.pw)  
**Prefix:** `/api/anime`

### 1. Currently Airing Anime

```
GET /api/anime/airing
GET /api/anime/airing?page=2
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |

**Response:**
```json
{
  "paginationInfo": {
    "total": 150,
    "perPage": 30,
    "currentPage": 1,
    "lastPage": 5
  },
  "data": [
    {
      "id": 12345,
      "anime_id": 67890,
      "title": "One Piece",
      "episode": 1122,
      "edition": null,
      "fansub": "Pahe",
      "image": "https://i.animepahe.pw/snapshots/one-piece.jpg",
      "session": "one-piece-1122",
      "link": "/api/anime/one-piece"
    }
  ]
}
```

---

### 2. Search Anime

```
GET /api/anime/search?q=naruto
GET /api/anime/search?q=one+piece&page=2
```

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `q` | string | ✅ | — | Search query |
| `page` | number | — | `1` | Page number |

**Response:**
```json
{
  "paginationInfo": { "total": 5, "currentPage": 1, "lastPage": 1 },
  "data": [
    {
      "id": 123,
      "title": "Naruto",
      "status": "Finished Airing",
      "type": "TV",
      "episodes": 220,
      "score": 79,
      "year": 2002,
      "season": "Fall",
      "poster": "https://i.animepahe.pw/posters/naruto.jpg",
      "session": "naruto",
      "link": "/api/anime/naruto"
    }
  ]
}
```

---

### 3. Browse Anime List (A-Z Catalog)

```
GET /api/anime/list
GET /api/anime/list?tab=A
GET /api/anime/list?tab=A&genre=action
GET /api/anime/list?tab=hash        # For titles starting with numbers/symbols
GET /api/anime/list?page=2&genre=fantasy
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `tab` | string | — | First letter filter (`A`–`Z`, or `hash` for `#`) |
| `genre` | string | — | Genre filter (`action`, `romance`, `fantasy`, etc.) |

**Response:**
```json
[
  {
    "title": "Attack on Titan",
    "url": "/anime/shingeki-no-kyojin",
    "type": "TV"
  }
]
```

> **Note:** Use `hash` instead of `#` for titles starting with numbers or symbols.

---

### 4. Anime Details

```
GET /api/anime/:id
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `:id` | string | ✅ | Anime session slug (e.g., `naruto`, `one-piece`) |

**Response:**
```json
{
  "ids": {
    "animepahe_id": "12345",
    "anidb": "67890",
    "anilist": "12345",
    "animePlanet": "naruto",
    "ann": "naruto",
    "mal": "20"
  },
  "title": "Naruto",
  "image": "https://i.animepahe.pw/posters/naruto.jpg",
  "synopsis": "Moments prior to Naruto Uzumaki's birth...",
  "type": "TV",
  "episodes": "220",
  "status": "Finished Airing",
  "duration": "23 min",
  "aired": "Oct 03, 2002 to Feb 08, 2007",
  "season": "Fall 2002",
  "studio": "Pierrot",
  "themes": ["Martial Arts"],
  "genre": ["Action", "Adventure", "Comedy"],
  "relations": {
    "Sequel": [{ "title": "Naruto Shippuden", "session": "naruto-shippuden" }]
  },
  "recommendations": [{ "title": "Bleach", "session": "bleach" }]
}
```

---

### 5. Anime Episode List

```
GET /api/anime/:id/releases
GET /api/anime/:id/releases?sort=episode_desc&page=1
GET /api/anime/:id/releases?sort=episode_asc&page=2
```

**Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `:id` | string | ✅ | Anime session slug |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | string | `episode_desc` | Sort order (`episode_desc`, `episode_asc`) |
| `page` | number | `1` | Page number |

> **⚠️ Note:** This endpoint may be broken due to upstream API changes on Animepahe. Use anime details + streaming endpoint directly.

---

### 6. Streaming & Download Links

```
GET /api/anime/:id/:ep
GET /api/anime/:id/:ep?downloads=true
GET /api/anime/:id/:ep?downloads=false
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `:id` | string | ✅ | Anime session slug |
| `:ep` | string | ✅ | Episode session ID (from airing/search endpoints) |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `downloads` | boolean | `true` | Include download links. Set `false` for faster responses |

**Response:**
```json
{
  "ids": { "animepahe_id": 12345, "mal_id": 20 },
  "session": "abc123def",
  "provider": "kwik",
  "episode": "5",
  "anime_title": "Naruto",
  "sources": [
    {
      "url": "https://vault-1.kwik.cx/stream/14/05/abc123/uwu.m3u8",
      "embed": "https://kwik.cx/e/abc123",
      "resolution": "1080",
      "isDub": false,
      "fanSub": "Pahe",
      "download": "/api/anime/download-proxy?url=..."
    },
    {
      "url": "https://vault-1.kwik.cx/stream/14/05/def456/uwu.m3u8",
      "resolution": "720",
      "isDub": false,
      "fanSub": "Pahe"
    }
  ],
  "downloads": [
    {
      "fansub": "Pahe",
      "quality": "1080p",
      "resolution": "1080",
      "filesize": "450MB",
      "isDub": false,
      "pahe": "https://pahe.li/xyz",
      "download": "/api/anime/download-proxy?url=..."
    }
  ]
}
```

**Resolution & metadata fields:**

| Field | Description |
|-------|-------------|
| `url` | Direct m3u8 HLS stream URL |
| `embed` | Kwik iframe embed URL |
| `resolution` | Video resolution (e.g., `360`, `720`, `1080`) |
| `isDub` | `true` if English dubbed |
| `fanSub` | Fansub group name (e.g., `Pahe`, `SubsPlease`) |
| `download` | Proxy URL for direct MP4 download (bypasses Cloudflare) |

---

### 7. Download Proxy

```
GET /api/anime/download-proxy?url=https://kwik.cx/stream/...
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✅ | HTTPS URL to the download source (must start with `https://`) |

Uses Playwright to bypass Cloudflare protection and streams the file directly to the client.

> **⚠️ Note:** This endpoint launches a browser internally. Timeout is 120 seconds. Not recommended for high-traffic use without concurrency limits.

---

### 8. Download Links (Deprecated)

```
GET /api/anime/download-links?url=https://pahe.li/xyz
```

**Status:** ⚠️ **Deprecated (501)** — Broken since Kwik added Cloudflare protection.

**Response:**
```json
{
  "status": 501,
  "message": "DEPRECATED: This endpoint is broken due to Cloudflare protection on kwik.cx.",
  "workaround": "Use /api/anime/:id/:ep instead. Direct MP4 download URLs are provided under sources[].download and downloads[].download."
}
```

---

### 9. Encoding Queue Status

```
GET /api/anime/queue
```

Returns the current encoding queue status on Animepahe — shows upcoming episodes being processed.

**Response:**
```json
{
  "data": [
    {
      "title": "One Piece",
      "episode": 1123,
      "resolution": "1080",
      "filesize": "500MB",
      "fansub": "Pahe",
      "progress": "50%",
      "published": false
    }
  ]
}
```

---

## Route Summary

### All Endpoints at a Glance

| Method | Route | Description | Avg Response |
|--------|-------|-------------|-------------|
| `GET` | `/health` | Server health & stats | <1ms |
| `GET` | `/docs` | Interactive documentation | <50ms |
| **Manga** | | | |
| `GET` | `/api/manga/list` | Browse manga by genre/page | ~2s |
| `GET` | `/api/manga/list?category=action&state=ongoing` | Filtered browse | ~2s |
| `GET` | `/api/manga/:id` | Manga details + chapters | ~1s |
| `GET` | `/api/manga/:id/:ch` | Chapter images | ~1s |
| `GET` | `/api/manga/search/:query` | Search manga | ~1s |
| **Anime** | | | |
| `GET` | `/api/anime/airing` | Currently airing anime | ~0.3s |
| `GET` | `/api/anime/search?q=` | Search anime | ~0.4s |
| `GET` | `/api/anime/list` | A-Z catalog browse | ~2s |
| `GET` | `/api/anime/list?tab=A&genre=action` | Filtered browse | ~2s |
| `GET` | `/api/anime/:id` | Anime details | ~1s |
| `GET` | `/api/anime/:id/releases` | Episode list | ⚠️ Broken |
| `GET` | `/api/anime/:id/:ep` | Streaming + download links | ~5-14s |
| `GET` | `/api/anime/:id/:ep?downloads=false` | Streaming only (faster) | ~3-8s |
| `GET` | `/api/anime/download-proxy?url=` | Direct file download | ~5-30s |
| `GET` | `/api/anime/download-links` | Direct download links | ❌ Deprecated (501) |
| `GET` | `/api/anime/queue` | Encoding queue status | ~0.3s |

---

## Usage as a Library (Anime Only)

The anime API can be used as a Node.js library without running a server:

```bash
npm install github:aor-rex/anikuro-api
```

```javascript
const anime = require("animepahe-api");

// Initialize (cookie pre-fetch)
await anime.initialize();

// Search
const results = await anime.search("Naruto");

// Get anime details
const info = await anime.getInfo("naruto");

// Get episode streaming links
const streams = await anime.getStreamingLinks("naruto", "episode-session-id");
console.log(streams.sources);    // HLS streams
console.log(streams.downloads);  // Direct download links
```

---

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faor-rex%2Fanikuro-api)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/aor-rex/anikuro-api)

Or use the included Dockerfile:

```bash
docker build -t anikuro-api .
docker run -p 7860:7860 -e REDIS_URL=redis://... anikuro-api
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": 404,
  "message": "Anime not found"
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request — missing/invalid parameter |
| `401` | Unauthorized — invalid or missing API key |
| `404` | Not found — anime/manga/chapter doesn't exist |
| `429` | Too many requests — rate limit exceeded |
| `500` | Internal server error |
| `501` | Deprecated endpoint |
| `502` | Bad gateway — Cloudflare challenge failed |
| `503` | Service unavailable — upstream scraping failed |

---

## Technologies Used

| Category | Packages |
|----------|----------|
| Server | Express, Body-Parser, CORS |
| Scraping | Cheerio, Cloudscraper, Playwright, @sparticuz/chromium |
| HTTP | Axios |
| JS Execution | JSDOM, VM |
| Caching | Redis, Disk cache (JSON files) |
| Docs | Astro, Starlight |
| Dev | Nodemon, Dotenv |

---

## License

MIT License — see `LICENSE` file.

## Disclaimer

This project is **not affiliated with or endorsed by** Animepahe or MangaBuddy. It is an unofficial API created for **educational purposes**.

## Support

If you find this project helpful, give it a ⭐ on GitHub!

- **GitHub:** https://github.com/aor-rex/anikuro-api
- **Original Anime API:** https://github.com/ElijahCodes12345/animepahe-api
- **Original Manga API:** https://github.com/kiraaziz/mangahook-api/
