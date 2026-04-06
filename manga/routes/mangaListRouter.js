const dataCollector = require("../middleware/mangaList/dataCollectorMiddleware");
const pageValidation = require("../middleware/mangaList/pageValidationMiddleware");
const mangaListController = require("../controllers/ListMangaController");

const mangaList = require("express").Router();

// FIX Bug #39/44: Removed redundant dataValidationMiddleware
// pageValidation handles all query validation now
mangaList.get("/", dataCollector, pageValidation, mangaListController);

module.exports = mangaList;
