const express = require("express");
const AnimeListController = require("../controllers/animeListController");

const router = express.Router();

router.get("/list", AnimeListController.getAllAnime);
router.get("/list/:tag1/:tag2", AnimeListController.getAnimeByTags);

module.exports = router;
