const cheerio = require("cheerio");

const SearchManga = (req, res) => {
  // Use HTML from middleware (no re-scraping!)
  if (!req.html) {
    return res.status(500).json({ error: "Failed to load search results" });
  }

  const $ = cheerio.load(req.html);
  const mangaList = [];

  $(".book-item").each((index, val) => {
    const target = $(val);
    const id = target.find(".thumb a").attr("href");
    const image =
      target.find(".thumb img").attr("data-src") ||
      target.find(".thumb img").attr("src");
    const title = target.find(".meta h3 a").text().trim();

    if (id && title) {
      mangaList.push({
        id: id.replace(/\//g, ""), // FIX Bug #20: Global replace
        image: image || "",
        title: title,
      });
    }
  });

  res.json({
    mangaList: mangaList, // FIX Bug #21: Removed redundant spread
    metaData: req.metaData,
  });
};

module.exports = SearchManga;
