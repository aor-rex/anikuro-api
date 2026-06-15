const axios = require("axios");
const PlayModel = require("../models/playModel");
const Animepahe = require("../scrapers/animepahe");
const Config = require("../utils/config");
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

  static async proxyDownload(req, res, next) {
    try {
      const target = String(req.query.url || '').trim();
      if (!target) {
        throw new CustomError('url is required', 400);
      }

      let parsed;
      try {
        parsed = new URL(target);
      } catch (_) {
        throw new CustomError('invalid url', 400);
      }

      const host = parsed.hostname.toLowerCase();
      const allowedHosts = [
        'uwucdn', 'owocdn', 'hakunaymatata', 'animepahe', 'pahe', 'kwik'
      ];
      if (!allowedHosts.some((token) => host.includes(token))) {
        throw new CustomError('domain not allowed', 403);
      }

      const headers = {
        'User-Agent': Config.userAgent,
        'Referer': 'https://kwik.cx/',
        'Origin': 'https://kwik.cx'
      };

      const cdnCookies = Animepahe.getCdnCookies();
      if (cdnCookies) headers.Cookie = cdnCookies;

      if (req.headers.range) headers.Range = req.headers.range;

      const upstream = await axios.get(target, {
        responseType: 'stream',
        headers,
        timeout: 30000,
        validateStatus: () => true
      });

      if (upstream.status >= 400) {
        const chunks = [];
        for await (const chunk of upstream.data) {
          chunks.push(chunk);
          if (chunks.reduce((n, b) => n + b.length, 0) >= 2048) break;
        }
        const preview = Buffer.concat(chunks).toString('utf8', 0, 2048);
        console.error(`[download-proxy] upstream blocked: status=${upstream.status} host=${host} preview=${preview.slice(0, 160).replace(/\s+/g, ' ')}`);
        throw new CustomError('download upstream blocked', 502);
      }

      const passthrough = [
        'content-type', 'content-length', 'content-disposition',
        'accept-ranges', 'content-range', 'etag', 'last-modified'
      ];
      for (const key of passthrough) {
        const value = upstream.headers[key];
        if (value) res.setHeader(key, value);
      }
      res.status(upstream.status);
      upstream.data.pipe(res);
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
