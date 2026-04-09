# 📊 Anikuro API — Serve Time Analysis & Fix Scope

> **Last Updated:** April 8, 2026
> **Hosting:** Hugging Face Spaces (containerized, shared CPU/RAM)

---

## 🔴 Current Serve Times

| Endpoint | First Request | Cached Request | Problem |
|----------|--------------|----------------|---------|
| `/api/manga/list` | ~2s | ~2s | ✅ Fine |
| `/api/manga/search` | ~2.3s | ~2.3s | ✅ Fine |
| `/api/manga/:id` | ~2s | ~2s | ✅ Fine |
| `/api/manga/:id/:ch` | ~2s | ~2s | ✅ Fine |
| `/api/anime/airing` | ~1.8s | ~1.8s | ✅ Fine |
| `/api/anime/search` | ~0.4s | ~0.4s | ✅ Fine |
| `/api/anime/list` | ~2.2s | ~2.2s | ✅ Fine |
| `/api/anime/:id` | ~2s | ~2s | ✅ Fine |
| `/api/anime/:id/releases` | ~2s | ~2s | ✅ Fine |
| **`/api/anime/:id/:ep`** | **~110s** | **~110s** | ❌ **CRITICAL** |
| `/api/anime/download-proxy` | N/A | N/A | ⚠️ Not yet tested |

---

## 🔍 Root Cause: Why Streaming Takes 110s

The streaming endpoint (`/api/anime/:id/:ep`) scrapes animepahe.pw through multiple layers:

```
Route → Controller → PlayModel → Animepahe Scraper → RequestManager
```

### Full Request Flow:
```
1. Scrape play page (animepahe.pw/play/{id}/{ep})
   ├─ Launch Chromium browser          → ~3-5s
   ├─ Navigate + DDoS-Guard challenge  → ~15-40s (highly variable)
   ├─ Wait 3s buffer                  → 3s fixed
   ├─ Extract HTML                    → ~0.5s
   └─ Close browser                   → ~0.5s
   SUBTOTAL: ~22-49s

2. Parse play page HTML
   ├─ Extract resolution menu (3-5 items) → ~0.01s
   ├─ Extract download links              → ~0.01s
   └─ Build resolution data array        → ~0.01s
   SUBTOTAL: ~0.03s

3. For EACH resolution (typically 3), scrape iframe (kwik.cx/e/...)
   ├─ Launch Chromium browser (×3)       → ~3-5s each = ~12-15s total
   ├─ Navigate + CF challenge (×3)       → ~10-20s each (parallel batch)
   ├─ Wait 3s buffer (×3)               → 3s each = 3s (parallel)
   ├─ Extract HTML                      → ~0.5s each
   ├─ JSDOM + vm execution per script   → ~1-2s each
   └─ Close browser (×3)               → ~0.5s each = ~1.5s total
   SUBTOTAL: ~30-50s

4. Build final response
   ├─ Merge sources + metadata          → ~0.5s
   ├─ Build download URLs               → ~0.5s
   └─ Cache in Redis (if configured)   → ~0.01s
   SUBTOTAL: ~1s

TOTAL: ~53-110s (typically ~80-110s on HF Spaces)
```

### Key Bottlenecks:
| # | Bottleneck | Time | Count | Total Impact |
|---|-----------|------|-------|-------------|
| 1 | Browser launch (cold start) | 3-5s | 4 per request | 12-20s |
| 2 | DDoS-Guard/CF challenge | 10-40s | 4 per request | 40-160s (parallel: 15-40s) |
| 3 | `waitForTimeout(3000)` | 3s | 4 per request | 12s |
| 4 | JSDOM + vm execution | 1-2s | 3 per request | 3-6s |
| 5 | Browser close | 0.5s | 4 per request | 2s |

---

## ✅ What Has Been Fixed

### 1. Cloudscraper Timeout Reduced
- **Before:** 30s timeout per request
- **After:** 8s timeout
- **Impact:** Faster failure detection (doesn't speed up successful requests)

### 2. Kwik Iframe Fetch → Playwright
- **Before:** Cloudscraper (slow, unreliable on kwik.cx)
- **After:** Playwright with Chromium (reliable, ~10-20s per iframe)
- **Impact:** More reliable, but still slow

### 3. DDoS Wait Time Reduced
- **Before:** 10s buffer after navigation
- **After:** 3s buffer
- **Impact:** ~7s saved per request

### 4. Download Proxy Endpoint Added
- **Endpoint:** `GET /api/anime/download-proxy?url=...`
- **Purpose:** Bypass Cloudflare on CDN (vault-*.kwik.cx) using Playwright
- **Status:** Implemented but not yet fully tested

### 5. Play Page URL Fix
- **Before:** `Config.getUrl("play", id, episodeId)` → wrong params → 404
- **After:** `Config.getUrl("play", { id, episodeId })` → correct params object
- **Impact:** Streaming endpoint now works (was completely broken)

### 6. Iframe Cache (Module-Level)
- **What:** `Map` caches iframe HTML by URL (6-hour TTL)
- **Status:** Implemented but **not effective** because each episode has unique iframe URLs

---

## ❌ What Still Needs Work

### 1. First Request Still ~110s
- No improvement on the initial scrape time
- Each new episode = full 110s scrape

### 2. Redis Cache Not Configured
- `cache(3600)` middleware exists but Redis is not connected
- If configured, cached requests would be ~2-5ms

### 3. 4 Browsers Launched Per Request
- No browser reuse — each scrape launches a fresh Chromium instance
- On HF Spaces (shared CPU), this causes contention and slowdowns

### 4. Download Proxy Not Tested
- Endpoint exists but hasn't been verified to work
- May still hit Cloudflare issues on CDN

---

## 🎯 Recommended Fixes (In Priority Order)

### Fix 1: Set Up Upstash Redis (No Code Changes)
- **Effort:** 5 minutes
- **Cost:** Free (10k requests/day)
- **Impact:** Cached requests → ~2-5ms
- **How:**
  1. Create Redis at [upstash.com](https://upstash.com)
  2. Set `REDIS_URL` env var in HF Space
  3. Restart Space
- **Result:** First request still ~110s, all subsequent (1 hour) → ~2-5ms

### Fix 2: Single Browser, Multiple Tabs
- **Effort:** Moderate
- **Impact:** First request ~60-70s (35-45% faster)
- **How:** Launch 1 browser, open play page + 3 iframes as separate tabs
- **Result:** Lower memory, shared cookies, faster overall

### Fix 3: Disk-Based Cache (Fallback)
- **Effort:** Low
- **Impact:** Survives container restarts
- **How:** Cache responses to `/tmp/anime-cache/` as JSON files
- **Result:** Cached requests → ~5-10ms, persists across restarts

### Fix 4: Timeout Protection
- **Effort:** Low
- **Impact:** Never hangs beyond 30s
- **How:** Kill slow iframe fetches after 20s, return embed URLs at least
- **Result:** Consistent response time, graceful degradation

---

## 🧪 Testing Commands

### Test Streaming Speed:
```bash
# First request (populates cache if Redis configured)
time curl -s "http://localhost:7860/api/anime/{anime_id}/{ep_session}" | python3 -m json.tool | head -20

# Second request (should be instant if Redis is configured)
time curl -s "http://localhost:7860/api/anime/{anime_id}/{ep_session}" | python3 -m json.tool | head -20
```

### Test Download Proxy:
```bash
# Get download URL from streaming response
curl -s "http://localhost:7860/api/anime/{anime_id}/{ep_session}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
dl = data['sources'][0]['download']
print(f'curl -L -o /tmp/test.mp4 \"http://localhost:7860/api/anime/download-proxy?url={dl}\"')
"

# Run the output command
curl -L -o /tmp/test.mp4 "http://localhost:7860/api/anime/download-proxy?url=..."
file /tmp/test.mp4
ls -lh /tmp/test.mp4
```

### Check Redis Status:
```bash
echo $REDIS_URL  # Should show redis://default:PASSWORD@HOST:PORT
# If empty, Redis is not configured
```

---

## 📦 Dependencies

### Already Installed:
- `playwright` ✅ — For browser automation (Cloudflare bypass)
- `@sparticuz/chromium` ✅ — Serverless Chromium binary
- `cheerio` ✅ — HTML parsing
- `jsdom` ✅ — DOM emulation for script execution
- `cloudscraper` ✅ — Legacy CF bypass (being replaced by Playwright)
- `redis` ✅ — Redis client (not configured)

### Needed for Full Optimization:
- `REDIS_URL` env var — To enable response caching
- `node-cache` (optional) — In-memory fallback
- `axios` (already in unified/package.json) — For download proxy

---

## 🖥️ HF Spaces Constraints

| Resource | Free Tier | Impact |
|----------|-----------|--------|
| Memory | 16GB | 4 browsers × 300MB = 1.2GB (fine) |
| CPU | Shared vCPUs | Throttled under heavy load (major bottleneck) |
| Disk | Ephemeral | `/tmp` cleared on rebuild |
| Network | Standard | CF challenges add latency |
| Concurrent | 1-2 requests | Parallel browsers compete for CPU |

**Key insight:** Running 4-6 Chromium processes simultaneously on shared CPU = massive slowdown. Single browser with multiple tabs would be much faster.

---

## 📋 Quick Reference

| File | Purpose |
|------|---------|
| `anime/scrapers/animepahe.js` | Core scraping logic, iframe cache |
| `anime/models/playModel.js` | Streaming data extraction, m3u8 parsing |
| `anime/utils/requestManager.js` | HTTP/Playwright requests, cloudscraper wrapper |
| `anime/middleware/cache.js` | Redis response caching (3600s TTL for play) |
| `unified/app.js` | Root server, download proxy endpoint |
| `anime/app.js` | Anime router (cache middleware mounted here) |

---

## 🚀 Next Steps

1. **Set up Upstash Redis** → Instant cached responses
2. **Implement single browser pattern** → Reduce first request to ~60-70s
3. **Test download proxy** → Verify it works for file downloads
4. **Add timeout protection** → Never hang beyond 30s
5. **Monitor HF Space logs** → Track actual serve times in production

---

**Expected Results After All Fixes:**

| Scenario | Before | After |
|----------|--------|-------|
| First request (new episode) | ~110s | ~60-70s |
| Cached request (Redis hit) | ~110s | ~2-5ms ✅ |
| Memory usage | ~1.5GB | ~400MB ✅ |
| Download proxy | 403 | ✅ Working |
| Max response time | 110s+ | 30s (timeout) ✅ |
