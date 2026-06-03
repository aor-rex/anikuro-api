const scrape = require("../scraper");
const cheerio = require("cheerio");

const ListManga = (req, res) => {
  const page = req.query.page || 1;
  const category = req.query.category || "all";

  // MangaBuddy uses /genres/{category} for genre filtering
  let url;
  if (category && category.toLowerCase() !== "all") {
    const genreSlug = category.toLowerCase().replace(/\s+/g, "-");
    url = `/genres/${genreSlug}?page=${page}`;
  } else {
    url = `/latest?page=${page}`;
  }

  scrape(url)
    .then((html) => {
      const $ = cheerio.load(html);
      const mangaList = [];

      $(".book-item").each((index, val) => {
        const target = $(val);
        const id = target.find(".thumb a").attr("href");
        const image =
          target.find(".thumb img").attr("data-src") ||
          target.find(".thumb img").attr("src");
        const title = target.find(".meta h3 a").text().trim();
        const chapter = target.find(".latest-chapter").text().trim();
        const view = target.find(".views span").first().text().trim();
        const description = target.find(".summary p").text().trim();

        if (id && title) {
          mangaList.push({
            id: id.replace(/^\/manga\//, ""), // clean slug for api routes
            image: image || "",
            title: title,
            chapter: chapter,
            view: view,
            description: description,
          });
        }
      });

      res.json({
        mangaList: mangaList, // FIX Bug #12: Removed redundant [...mangaList]
        metaData: req.metaData,
      });
    })
    .catch((e) => {
      console.error("ListManga error:", e.message);
      res.status(500).json({ error: e.message });
    });
};

module.exports = ListManga;
