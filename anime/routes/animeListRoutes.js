const express = require("express");
const AnimeListController = require("../controllers/animeListController");

const router = express.Router();

// Browse anime list with query params: ?page=2&tab=A&genre=action
router.get("/list", AnimeListController.getAllAnime);

module.exports = router;
