const scrape = require("../../scraper");
const cheerio = require("cheerio");

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  if (entry) cache.delete(key); // Expired, remove it
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  // LRU-style: if cache exceeds 50 entries, delete oldest 25
  if (cache.size > 50) {
    const keysToDelete = [...cache.keys()].slice(0, 25);
    keysToDelete.forEach((k) => cache.delete(k));
  }
}

const pagesValidation = (req, res, next) => {
  req.query.page = Number(req.query.page) ? req.query.page : 1;

  const type = req.query.type || "latest";
  const state = req.query.state || "all";
  const category = req.query.category || "all";

  // FIX Bug #34: Include ALL query params in cache key
  const cacheKey = `totalPages_${type}_${category}_${state}`;
  const cached = getCached(cacheKey);

  if (cached) {
    req.metaData = { totalPages: cached, ...req.metaData };
    req.query.page = req.query.page > 0 ? req.query.page : 1;
    req.query.page =
      req.query.page <= req.metaData.totalPages
        ? req.query.page
        : req.metaData.totalPages;
    return next();
  }

  scrape(
    `/latest?type=${type}&category=${category}&state=${state}&page=99999999`,
  )
    .then((html) => {
      const $ = cheerio.load(html);

      // Find the last page number from pagination links
      let totalPages = 0;

      $('a[href*="/latest?page="]').each((index, val) => {
        const href = $(val).attr("href");
        const match = href.match(/page=(\d+)/);
        if (match) {
          const page = parseInt(match[1], 10);
          if (page > totalPages) {
            totalPages = page;
          }
        }
      });

      // FIX Bug #37: Conservative fallback, not arbitrary
      if (totalPages === 0) {
        totalPages = 50;
        console.warn(
          `[pageValidation] Could not detect total pages, defaulting to ${totalPages}`,
        );
      }

      // Cache the result
      setCache(cacheKey, totalPages);

      req.metaData = {
        totalPages: totalPages,
        ...req.metaData,
      };

      // FIX Bug #33/35: Proper parseInt with radix and NaN check
      let page = parseInt(req.query.page, 10);
      if (isNaN(page) || page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      req.query.page = page;

      next();
    })
    .catch((e) => {
      console.error("[pageValidation] Error:", e.message);
      // FIX Bug #37: Graceful fallback without crashing
      req.metaData = { totalPages: 50, ...req.metaData };
      let page = parseInt(req.query.page, 10);
      if (isNaN(page) || page < 1) page = 1;
      if (page > 50) page = 50;
      req.query.page = page;
      next();
    });
};

module.exports = pagesValidation;
