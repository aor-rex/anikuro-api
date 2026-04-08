const express = require("express");
const PlayController = require("../controllers/playController");

const router = express.Router();

router.get("/download-links", PlayController.getDownloadLinks);
router.get("/:id/:ep", PlayController.getStreamingLinks);

module.exports = router;
