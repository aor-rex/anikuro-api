const cheerio = require("cheerio");

const chapterList = (req, res, next) => {
  if (!req.html) {
    return next();
  }

  const $ = cheerio.load(req.html);
  const chapters = [];

  // MangaBuddy chapter list structure: ul.chapter-list > li > a
  $("ul.chapter-list li").each((index, val) => {
    const target = $(val);
    const link = target.find("a");
    const href = link.attr("href") || "";
    const title = link.find(".chapter-title").text().trim();
    const updateDate = link.find(".chapter-update").text().trim();

    // Extract chapter ID from URL
    const chapterId = href.split("/").pop();

    if (chapterId && title) {
      chapters.push({
        id: chapterId,
        path: href,
        name: title,
        view: "N/A",
        createdAt: updateDate,
      });
    }
  });

  req.chapterList = chapters;
  next();
};

module.exports = chapterList;
