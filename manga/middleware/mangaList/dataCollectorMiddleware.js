const scrape = require("../../scraper");
const cheerio = require("cheerio");

const dataCollector = (req, res, next) => {
  // Mangabuddy doesn't have the same filter structure as mangakakalot
  // Provide default metadata for compatibility with existing API
  req.metaData = {
    type: [
      { id: "latest", name: "Latest" },
      { id: "updated", name: "Updated" },
    ],
    state: [
      { id: "all", name: "all" },
      { id: "completed", name: "Completed" },
      { id: "ongoing", name: "Ongoing" },
    ],
    category: [
      { id: "all", name: "all" },
      { id: "action", name: "Action" },
      { id: "adventure", name: "Adventure" },
      { id: "comedy", name: "Comedy" },
      { id: "drama", name: "Drama" },
      { id: "fantasy", name: "Fantasy" },
      { id: "romance", name: "Romance" },
    ],
  };

  next();
};

module.exports = dataCollector;
