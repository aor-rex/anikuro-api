#!/usr/bin/env bash
# ============================================================
# pahe-api — Full endpoint test with response validation
# Usage: chmod +x test.sh && ./test.sh
# ============================================================

BASE="http://localhost:3000"
PASS=0
FAIL=0
WARN=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Helper: validate JSON structure
check() {
    local name="$1"
    local json="$2"
    local path="$3"
    local expected_type="$4"

    local val
    val=$(echo "$json" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    keys = '$path'.split('.')
    obj = d
    for k in keys:
        if k.isdigit():
            obj = obj[int(k)]
        else:
            obj = obj[k]
    print(type(obj).__name__, repr(obj)[:80])
except Exception as e:
    print('ERROR', str(e))
" 2>&1)

    local actual_type="${val%% *}"
    local actual_val="${val#* }"

    if [[ "$val" == ERROR* ]]; then
        echo -e "  ${RED}✗ FAIL${NC} $name → path '$path' not found: ${actual_val#ERROR }"
        ((FAIL++))
    elif [[ -n "$expected_type" && "$actual_type" != "$expected_type" ]]; then
        echo -e "  ${YELLOW}⚠ WARN${NC} $name → $path: expected $expected_type, got $actual_type ($actual_val)"
        ((WARN++))
    else
        echo -e "  ${GREEN}✓ PASS${NC} $name → $path: $actual_type $actual_val"
        ((PASS++))
    fi
}

# Helper: check HTTP status
status_check() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    local max_time="${4:-30}"

    local response
    response=$(curl -s -w "\n%{http_code}" --connect-timeout 10 --max-time "$max_time" "$url" 2>&1)
    local http_code
    http_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "$expected_code" ]]; then
        echo -e "${GREEN}✓ PASS${NC} [$http_code] $name"
        ((PASS++))
        echo "$body"
    else
        echo -e "${RED}✗ FAIL${NC} [$http_code] $name (expected $expected_code)"
        ((FAIL++))
        echo "$body" | head -5
    fi
}

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  pahe-api — Endpoint Validation Tests${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[1/13] GET /airing${NC}"
json=$(status_check "Airing anime" "$BASE/airing" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "paginationInfo.total" "$json" "paginationInfo.total" "int"
    check "paginationInfo.perPage" "$json" "paginationInfo.perPage" "int"
    check "paginationInfo.currentPage" "$json" "paginationInfo.currentPage" "int"
    check "data (array)" "$json" "data" "list"
    check "data[0].id" "$json" "data.0.id" "int"
    check "data[0].title" "$json" "data.0.title" "str"
    check "data[0].episode" "$json" "data.0.episode" "int"
    check "data[0].fansub" "$json" "data.0.fansub" "str"
    check "data[0].image (URL)" "$json" "data.0.image" "str"
    check "data[0].session" "$json" "data.0.session" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[2/13] GET /search?q=naruto${NC}"
json=$(status_check "Search anime" "$BASE/search?q=naruto" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "paginationInfo.total" "$json" "paginationInfo.total" "int"
    check "data (array)" "$json" "data" "list"
    check "data[0].id" "$json" "data.0.id" "int"
    check "data[0].title" "$json" "data.0.title" "str"
    check "data[0].status" "$json" "data.0.status" "str"
    check "data[0].type" "$json" "data.0.type" "str"
    check "data[0].episodes" "$json" "data.0.episodes" "int"
    check "data[0].score" "$json" "data.0.score" "float"
    check "data[0].year" "$json" "data.0.year" "int"
    check "data[0].poster (URL)" "$json" "data.0.poster" "str"
    check "data[0].session" "$json" "data.0.session" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[3/13] GET /search (page 2)?q=naruto&page=2${NC}"
json=$(status_check "Search (page 2)" "$BASE/search?q=naruto&page=2" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "paginationInfo.currentPage" "$json" "paginationInfo.currentPage" "int"
    check "data (array)" "$json" "data" "list"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[4/13] GET /list (A-Z) (A-Z List)${NC}"
json=$(status_check "Anime list" "$BASE/list" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "data (array)" "$json" "0" "list"
    check "[0].title" "$json" "0.title" "str"
    check "[0].url" "$json" "0.url" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[5/13] GET /list?tab=N (by letter)${NC}"
json=$(status_check "Anime list (letter N)" "$BASE/list?tab=N" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "[0].title" "$json" "0.title" "str"
    check "[0].url" "$json" "0.url" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[6/13] GET /list/genre/action (by tag)${NC}"
json=$(status_check "Anime list (genre/action)" "$BASE/list/genre/action" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "[0].title" "$json" "0.title" "str"
    check "[0].url" "$json" "0.url" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[7/13] GET /:id (Anime Info) (Anime Info)${NC}"
ANIME_ID="66e575d9-1c71-2117-bf09-acef2f6a0deb"
json=$(status_check "Anime info (Naruto)" "$BASE/$ANIME_ID" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "title" "$json" "title" "str"
    check "image (URL)" "$json" "image" "str"
    check "synopsis" "$json" "synopsis" "str"
    check "type" "$json" "type" "str"
    check "episodes (str)" "$json" "episodes" "str"
    check "status" "$json" "status" "str"
    check "season" "$json" "season" "str"
    check "studio" "$json" "studio" "str"
    check "ids.animepahe_id" "$json" "ids.animepahe_id" "str"
    check "ids.mal" "$json" "ids.mal" "str"
    check "ids.anilist" "$json" "ids.anilist" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[8/13] GET /:id/releases (Episodes) (Episodes)${NC}"
json=$(status_check "Episodes (Naruto)" "$BASE/$ANIME_ID/releases" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "paginationInfo.total" "$json" "paginationInfo.total" "int"
    check "paginationInfo.perPage" "$json" "paginationInfo.perPage" "int"
    check "paginationInfo.lastPage" "$json" "paginationInfo.lastPage" "int"
    check "data (array)" "$json" "data" "list"
    check "data[0].id" "$json" "data.0.id" "int"
    check "data[0].episode" "$json" "data.0.episode" "int"
    check "data[0].audio" "$json" "data.0.audio" "str"
    check "data[0].duration" "$json" "data.0.duration" "str"
    check "data[0].session" "$json" "data.0.session" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[9/13] GET /:id/releases (sorted)?sort=&page=2${NC}"
EP_ID="9a11cba2022e39f2531d2d885a89558263c6a54bb07bb5fb46ef48a5b7e24c82"
json=$(status_check "Episodes (sorted + paged)" "$BASE/$ANIME_ID/releases?sort=episode_desc&page=2" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "paginationInfo.currentPage" "$json" "paginationInfo.currentPage" "int"
    check "data (array)" "$json" "data" "list"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[10/13] GET /:id/:ep (Stream + Downloads)${NC}"
json=$(status_check "Play (Naruto Ep 220)" "$BASE/$ANIME_ID/$EP_ID" "200" "120")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "provider" "$json" "provider" "str"
    check "episode" "$json" "episode" "str"
    check "anime_title" "$json" "anime_title" "str"
    check "sources (array)" "$json" "sources" "list"
    check "sources[0].url (m3u8)" "$json" "sources.0.url" "str"
    check "sources[0].isM3U8" "$json" "sources.0.isM3U8" "bool"
    check "sources[0].embed (URL)" "$json" "sources.0.embed" "str"
    check "sources[0].resolution (str)" "$json" "sources.0.resolution" "str"
    check "sources[0].download (URL)" "$json" "sources.0.download" "str"
    check "downloads (array)" "$json" "downloads" "list"
    check "downloads[0].fansub" "$json" "downloads.0.fansub" "str"
    check "downloads[0].quality" "$json" "downloads.0.quality" "str"
    check "downloads[0].filesize" "$json" "downloads.0.filesize" "str"
    check "downloads[0].isDub" "$json" "downloads.0.isDub" "bool"
    check "downloads[0].pahe (URL)" "$json" "downloads.0.pahe" "str"
    check "downloads[0].download (URL)" "$json" "downloads.0.download" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[11/13] GET /:id/:ep?downloads=false (Stream Only)${NC}"
json=$(status_check "Play (stream only)" "$BASE/$ANIME_ID/$EP_ID?downloads=false" "200" "60")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "sources (array)" "$json" "sources" "list"
    check "downloads (empty)" "$json" "downloads" "list"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[12/13] GET /download-links?url= (DEPRECATED)${NC}"
json=$(status_check "Download links (deprecated)" "$BASE/download-links?url=https://pahe.win/ecJzv" "200" "60")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "status" "$json" "status" "int"
    check "message (deprecated)" "$json" "message" "str"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[13/13] GET /queue${NC}"
json=$(status_check "Queue" "$BASE/queue" "200")
echo ""
if echo "$json" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    check "data (array)" "$json" "data" "list"
fi
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}PASSED: $PASS${NC} | ${RED}FAILED: $FAIL${NC} | ${YELLOW}WARNINGS: $WARN${NC}"
echo -e "${CYAN}============================================${NC}"

if [[ $FAIL -gt 0 ]]; then
    exit 1
fi
exit 0
