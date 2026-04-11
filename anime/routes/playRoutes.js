const express = require("express");
const PlayController = require("../controllers/playController");

const router = express.Router();

// NOTE: /download-links endpoint removed — was deprecated (501) due to
// Cloudflare on kwik.cx. Use /:id/:ep → sources[].download instead.
router.get("/:id/:ep", PlayController.getStreamingLinks);

module.exports = router;
