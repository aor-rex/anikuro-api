const scrape = require("../../scraper");

const mangaExist = (req, res, next) => {
  // Sanitize input - allow only alphanumeric, hyphens
  const mangaId = req.params.id.replace(/[^a-z0-9-]/gi, "");
  if (!mangaId || mangaId.length > 200) {
    return res.status(400).json({ error: "Invalid manga ID" });
  }

  const mangaUrl = `/${mangaId}`;

  scrape(mangaUrl)
    .then((html) => {
      const hasContent =
        html.includes("book-details") || html.includes("chapter-list");

      if (!hasContent) {
        return res.status(404).json({
          state: 404,
          message: "Manga Not Exist",
        });
      }

      req.html = html;
      req.params.id = mangaId;
      next();
    })
    .catch((e) => {
      console.error("mangaExist error:", e.message);
      res.status(500).json({
        state: 500,
        message: "Something went wrong",
      });
    });
};

module.exports = mangaExist;
