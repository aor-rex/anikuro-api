const scrape = require("../../scraper");
const cheerio = require("cheerio");

// FIX Bug #41: Add caching to search validation
const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes for search results

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  if (entry) cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 50) {
    const keysToDelete = [...cache.keys()].slice(0, 25);
    keysToDelete.forEach((k) => cache.delete(k));
  }
}

const pagesValidation = (req, res, next) => {
  // FIX Bug #33: Proper parseInt with radix
  req.query.page = parseInt(req.query.page, 10);
  if (isNaN(req.query.page) || req.query.page < 1) req.query.page = 1;

  // Sanitize search query
  const searchQuery = encodeURIComponent(
    req.params.id.replace(/[<>]/g, "").trim(),
  );

  // FIX Bug #41: Check cache first
  const cacheKey = `searchPages_${searchQuery}`;
  const cached = getCached(cacheKey);

  if (cached) {
    req.metaData = { totalPages: cached.totalPages };
    req.html = cached.html;
    req.searchQuery = searchQuery;
    req.query.page =
      req.query.page <= cached.totalPages ? req.query.page : cached.totalPages;
    return next();
  }

  scrape(`/search?q=${searchQuery}`)
    .then((html) => {
      const $ = cheerio.load(html);
      let totalPages = 1;

      // Find last page from pagination links
      $('a[href*="/search?q="]').each((index, val) => {
        const href = $(val).attr("href");
        const match = href.match(/page=(\d+)/);
        if (match) {
          const page = parseInt(match[1], 10);
          if (page > totalPages) {
            totalPages = page;
          }
        }
      });

      req.metaData = {
        totalPages: totalPages,
      };

      // Pass HTML to controller to avoid re-scraping (FIX Bug #3 double-request)
      req.html = html;
      req.searchQuery = searchQuery;

      // FIX Bug #42: Validate page properly
      if (totalPages > 0 && req.query.page > totalPages) {
        req.query.page = totalPages;
      }

      // Cache the result
      setCache(cacheKey, { totalPages, html });

      next();
    })
    .catch((e) => {
      console.error("[searchPageValidation] Error:", e.message);
      // FIX Bug #42: Better fallback - allow request to continue
      req.metaData = { totalPages: 1 };
      req.searchQuery = searchQuery;
      next();
    });
};

module.exports = pagesValidation;
