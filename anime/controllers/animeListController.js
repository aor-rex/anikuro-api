const AnimeListModel = require("../models/animeListModel");
const { CustomError } = require("../middleware/errorHandler");

class AnimeListController {
  static async getAllAnime(req, res, next) {
    try {
      const { page, tab, genre } = req.query;
      const animeList = await AnimeListModel.getAnimeList(page, tab, genre);

      if (!animeList) {
        throw new CustomError("Failed to fetch anime list", 404);
      }

      return res.json(animeList);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnimeListController;
