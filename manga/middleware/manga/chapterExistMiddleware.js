const scrape = require("../../scraper");

const chapterExist = (req, res, next) => {
  // Sanitize inputs
  const mangaId = req.params.id.replace(/[^a-z0-9-]/gi, "");
  const chapterId = req.params.ch.replace(/[^a-z0-9-.]/gi, "");

  if (
    !mangaId ||
    !chapterId ||
    mangaId.length > 200 ||
    chapterId.length > 200
  ) {
    return res.status(400).json({ error: "Invalid manga or chapter ID" });
  }

  const chapterUrl = `/${mangaId}/${chapterId}`;

  scrape(chapterUrl)
    .then((html) => {
      const hasContent =
        html.includes("chapter-images") || html.includes("chapter-content");

      if (!hasContent) {
        return res.status(404).json({
          state: 404,
          message: "Chapter Not Exist",
        });
      }

      req.html = html;
      req.params.id = mangaId;
      req.params.ch = chapterId;
      next();
    })
    .catch((e) => {
      console.error("chapterExist error:", e.message);
      res.status(500).json({
        state: 500,
        message: "Something went wrong",
      });
    });
};

module.exports = chapterExist;
