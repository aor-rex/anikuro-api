# 🔍 Streaming Endpoint Investigation Report

## ❌ Root Cause: **Missing Playwright/Chromium + DDoS-Guard Cookies**

The streaming endpoint (`/api/anime/:id/:ep`) fails because:

1. **❌ Playwright/Chromium NOT installed**
2. **❌ No DDoS-Guard cookies cached**
3. **❌ animepahe.pw requires Cloudflare/DDoS-Guard bypass**

---

## 📊 Evidence

### 1. Direct URL Test
```bash
curl -s https://animepahe.pw/play/{anime_id}/{ep_session}
# Returns: HTTP 403 (DDoS-Guard challenge page)
```

### 2. Cookie Status
```
❌ ~/.animepahe-cookies.json: not found
❌ anime/cookies.json: not found
```

### 3. Playwright Status
```
❌ Playwright browsers NOT installed
   ~/.cache/ms-playwright/: No such file or directory
```

### 4. Error Stack Trace
```
CustomError: Resource not found
    at RequestManager.fetchApiData (utils/requestManager.js:498:15)
    at Animepahe.scrapePlayPage (scrapers/animepahe.js:277:20)
    at Animepahe.getData (scrapers/animepahe.js:798:20)
    at PlayModel.getStreamingLinks (models/playModel.js:13:25)
    at getStreamingLinks (controllers/playController.js:21:21)
```

**Note:** The error says "Resource not found" (404) but the actual issue is **403 Forbidden** from DDoS-Guard.

---

## 🔧 How the Scraper Works

1. **`scrapePlayPage()`** tries to fetch `https://animepahe.pw/play/{id}/{episode}`
2. It calls `getCookies()` to get DDoS-Guard bypass cookies
3. If no cookies exist, it calls `refreshCookies()` which:
   - Launches **Playwright/Chromium** browser
   - Navigates to animepahe.pw
   - Waits for DDoS-Guard challenge to solve automatically
   - Extracts cookies from the browser
   - Saves to `cookies.json`
4. Uses cookies to make authenticated request

**The Problem:** Step 3 fails because Playwright/Chromium is not installed, so:
- Cookie refresh fails silently
- Empty/invalid cookies are used
- Request returns 403
- `requestManager.js` line 498 throws "Resource not found" (misleading error)

---

## ✅ Solution: Install Playwright + Chromium

Run this command:

```bash
cd /home/aor_rex/Documents/12Projects/anikuro-api/anime
npx playwright install chromium
```

This will:
- Download Chromium browser (~150MB)
- Install to `~/.cache/ms-playwright/chromium-*/`
- Install system dependencies (libnss3, libgbm1, etc.)

**After installation:**
```bash
# Restart the unified server
cd ../unified
npm start

# Test streaming endpoint
curl -s "http://localhost:7860/api/anime/{anime_id}/{ep_session}" | python3 -m json.tool
```

The scraper will automatically:
1. Launch Chromium
2. Solve DDoS-Guard challenge
3. Save cookies
4. Fetch streaming links successfully

---

## 🧪 Verification Steps

After installing Playwright:

```bash
# 1. Check installation
ls ~/.cache/ms-playwright/
# Should show: chromium-XXXX/

# 2. Test cookie generation
cd /home/aor_rex/Documents/12Projects/anikuro-api/anime
node -e "
const Animepahe = require('./scrapers/animepahe');
const scraper = new Animepahe();
scraper.refreshCookies().then(() => {
  console.log('✅ Cookies refreshed!');
  const fs = require('fs');
  const cookies = JSON.parse(fs.readFileSync('./cookies.json'));
  console.log('Cookie count:', cookies.cookies.length);
}).catch(e => console.error('❌ Error:', e.message));
"

# 3. Test full streaming endpoint
curl -s "http://localhost:7860/api/anime/search?q=one+punch+man" | python3 -c "
import sys, json, subprocess
data = json.load(sys.stdin)
anime_id = data['data'][0]['session']
print(f'Anime: {data[\"data\"][0][\"title\"]}')
print(f'ID: {anime_id}')

# Get releases
rel = json.loads(subprocess.run(
    ['curl', '-s', f'http://localhost:7860/api/anime/{anime_id}/releases?sort=episode_desc&page=1'],
    capture_output=True, text=True
).stdout)
ep = rel['data'][0]
print(f'Episode: {ep[\"episode\"]}')
print(f'Session: {ep[\"session\"]}')

# Test streaming
stream = json.loads(subprocess.run(
    ['curl', '-s', f'http://localhost:7860/api/anime/{anime_id}/{ep[\"session\"]}'],
    capture_output=True, text=True
).stdout)
if 'sources' in stream:
    print(f'✅ Sources: {len(stream[\"sources\"])}')
    for s in stream['sources'][:2]:
        print(f'  - {s.get(\"type\", \"?\")}: {s.get(\"src\", \"?\")[:60]}...')
else:
    print(f'❌ Error: {stream.get(\"error\", \"unknown\")}')
"
```

---

## 🎯 Alternative: Manual Cookie Injection

If you can't install Playwright, you can manually extract cookies from your browser:

1. Open Firefox/Chrome
2. Go to `https://animepahe.pw`
3. Wait for DDoS-Guard challenge to pass
4. Open DevTools → Application/Storage → Cookies
5. Copy all cookies (especially `__ddg1`, `__ddg2`, `__ddgid`, `__ddgmark`)
6. Format as: `__ddg1=value1; __ddg2=value2; ...`
7. Set as `ANIMEPAHE_COOKIES` env var or save to `anime/cookies.json`

**Format for `cookies.json`:**
```json
{
  "timestamp": 1712548800000,
  "cookies": [
    {"name": "__ddg1", "value": "...", "domain": ".animepahe.pw", "path": "/"},
    {"name": "__ddg2", "value": "...", "domain": ".animepahe.pw", "path": "/"}
  ]
}
```

---

## 📋 Current Endpoint Status

| Endpoint | Status | Reason |
|----------|--------|--------|
| `/api/anime/airing` | ✅ Working | Uses basic HTTP requests |
| `/api/anime/search` | ✅ Working | Uses basic HTTP requests |
| `/api/anime/list` | ✅ Working | Uses basic HTTP requests |
| `/api/anime/:id` | ✅ Working | Uses basic HTTP requests |
| `/api/anime/:id/releases` | ✅ Working | Uses basic HTTP requests |
| `/api/anime/:id/:ep` | ❌ Failing (403) | **Requires Playwright for DDoS-Guard bypass** |

---

## 🔮 Long-term Recommendations

### Option 1: Install Playwright (Recommended)
- Pros: Automatic cookie management, works out of the box
- Cons: ~150MB disk space, longer Docker builds
- Command: `npx playwright install chromium`

### Option 2: Manual Cookie Management
- Pros: No extra dependencies
- Cons: Cookies expire every 14 days, manual intervention needed
- Setup: Extract cookies once, save to `cookies.json`

### Option 3: Remove Streaming Endpoint
- Pros: Simplifies deployment
- Cons: Loses core functionality
- Note: Only if streaming is not critical

---

## 🚀 Immediate Fix

```bash
# ONE COMMAND to fix streaming:
cd /home/aor_rex/Documents/12Projects/anikuro-api/anime && npx playwright install chromium

# Then restart server
cd ../unified && npm start
```

**Expected result:** Streaming endpoint will work for ~14 days before cookies expire, then auto-refresh via Playwright.

---

**Last Updated:** April 8, 2026  
**Status:** ❌ Blocked on Playwright installation  
**Fix ETA:** 5 minutes to install
