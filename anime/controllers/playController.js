const PlayModel = require("../models/playModel");
const { CustomError } = require("../middleware/errorHandler");

class PlayController {
  static async getStreamingLinks(req, res, next) {
    try {
      const { id, ep } = req.params;
      const { downloads } = req.query;

      if (!id || !ep) {
        throw new CustomError("Both id and ep are required", 400);
      }

      // Parse downloads query parameter (defaults to true)
      // user can pass ?downloads=false or ?downloads=0 to skip downloads
      const includeDownloads =
        downloads === undefined || downloads === "true" || downloads === "1";

      // console.log(`[PlayController] Request query downloads: '${downloads}' -> includeDownloads: ${includeDownloads}`);

      const links = await PlayModel.getStreamingLinks(id, ep, includeDownloads);

      return res.json(links);
    } catch (error) {
      next(error);
    }
  }

  // @deprecated — Broken since kwik.cx added Cloudflare protection.
  // Direct MP4 download URLs are already available in /api/play/:id?episodeId=
  // under sources[].download and downloads[].download.
  // To fix: replace cloudscraper with Playwright in extractKwikUrl/getKwikDownloadUrl.
  static getDownloadLinks(req, res) {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: 400,
        message: "Url is required",
      });
    }

    return res.json({
      status: 501,
      message:
        "DEPRECATED: This endpoint is broken due to Cloudflare protection on kwik.cx.",
      workaround:
        "Use /api/play/:id?episodeId= instead. Direct MP4 download URLs are provided under sources[].download and downloads[].download.",
      fix_hint:
        "To restore this endpoint, replace cloudscraper with Playwright in scrapers/animepahe.js → extractKwikUrl() and getKwikDownloadUrl().",
    });

    // Original code preserved below for future restoration:
    // try {
    //   const links = await PlayModel.getDownloadLinks(url);
    //   return res.json(links);
    // } catch (error) {
    //   next(error);
    // }
  }
}

module.exports = PlayController;
