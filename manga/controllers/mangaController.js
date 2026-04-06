const cheerio = require("cheerio");

const mangaController = (req, res) => {
  if (!req.html) {
    return res.status(500).json({ error: "Failed to load manga details" });
  }

  const $ = cheerio.load(req.html);

  // Extract manga details - use data-src for lazy-loaded images
  const imageUrl =
    $(".book-details .cover .img-cover img").attr("data-src") ||
    $(".book-details .cover .img-cover img").attr("src") ||
    "";
  const name = $(".book-details .detail h1").text().trim();

  // Extract author from meta info
  let author = "";
  $(".book-details .detail .meta p").each((i, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes("author")) {
      author = $(el).find("a").text().trim();
    }
  });

  // Extract status
  let status = "";
  $(".book-details .detail .meta p").each((i, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes("status")) {
      status =
        $(el).find("a").text().trim() ||
        text.replace(/Status:?\s*/i, "").trim();
    }
  });

  // Extract updated date
  let updated = "";
  const firstChapterDate = $(".chapter-list .chapter-update")
    .first()
    .text()
    .trim();
  updated = firstChapterDate;

  // Extract genres - try multiple selectors
  const genres = [];

  // Try meta genres first
  $(".book-details .detail .meta p a").each((i, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("/genre/") || href.includes("/genres/")) {
      const genre = $(el)
        .text()
        .trim()
        .replace(/\s*,\s*$/g, "");
      // FIX Bug #14: Increased limit to 50, log when dropping
      if (genre && genre.length < 50) genres.push(genre);
    }
  });

  // If no genres found, try alternative selector
  if (genres.length === 0) {
    $(
      ".book-details .detail .genres a, .book-details .detail .genres span",
    ).each((i, el) => {
      const genre = $(el)
        .text()
        .trim()
        .replace(/\s*,\s*$/g, "");
      if (genre && genre.length < 50) genres.push(genre);
    });
  }

  const metaData = {
    imageUrl: imageUrl.startsWith("http")
      ? imageUrl
      : imageUrl
        ? `https://mangabuddy.com${imageUrl}`
        : "",
    name: name,
    author: author || "Unknown",
    status: status || "Unknown",
    updated: updated || "Unknown",
    view: "N/A",
    genres: genres.length > 0 ? genres : ["Unknown"],
  };

  res.json({
    ...metaData,
    chapterList: req.chapterList || [],
  });
};

module.exports = mangaController;
