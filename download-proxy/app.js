const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());

const PORT = parseInt(process.env.PORT || "7860", 10);
const USER_AGENT = process.env.USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isAllowedHost(host) {
  const tokens = ["uwucdn", "owocdn", "hakunaymatata", "animepahe", "pahe", "kwik"];
  return tokens.some((token) => host.includes(token));
}

async function fetchCookiesWithFlareSolverr(target) {
  const base = String(process.env.FLARESOLVERR_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";

  const session = process.env.FLARESOLVERR_SESSION || "download-proxy";
  const payload = {
    cmd: "request.get",
    url: target,
    session,
    maxTimeout: parseInt(process.env.FLARESOLVERR_MAX_TIMEOUT || "60000", 10)
  };

  const res = await axios.post(`${base}/v1`, payload, {
    timeout: payload.maxTimeout + 15000,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true
  });

  const data = res.data;
  if (!data || data.status !== "ok" || !data.solution) {
    throw new Error(data?.message || `FlareSolverr error (${res.status})`);
  }

  const cookies = Array.isArray(data.solution.cookies) ? data.solution.cookies : [];
  return cookies
    .filter((c) => c && c.name && c.value)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function tryFetch(target, extraHeaders = {}) {
  return axios.get(target, {
    responseType: "stream",
    timeout: 30000,
    headers: {
      "User-Agent": USER_AGENT,
      ...extraHeaders
    },
    validateStatus: () => true
  });
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "download-proxy" });
});

app.get("/api/anime/download-proxy", async (req, res) => {
  try {
    const target = String(req.query.url || "").trim();
    if (!target) {
      return res.status(400).json({ error: "url is required" });
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch (_) {
      return res.status(400).json({ error: "invalid url" });
    }

    const host = parsed.hostname.toLowerCase();
    if (!isAllowedHost(host)) {
      return res.status(403).json({ error: "domain not allowed" });
    }

    const cookieCandidates = [];
    if (process.env.CDN_COOKIES) cookieCandidates.push(process.env.CDN_COOKIES);
    if (process.env.SITE_COOKIES) cookieCandidates.push(process.env.SITE_COOKIES);

    if (process.env.FLARESOLVERR_URL) {
      try {
        const solvedCookies = await fetchCookiesWithFlareSolverr(target);
        if (solvedCookies) cookieCandidates.unshift(solvedCookies);
      } catch (err) {
        console.warn(`[download-proxy] flaresolverr cookie fetch failed: ${err.message}`);
      }
    }

    const headerProfiles = [
      { Referer: "https://kwik.cx/", Origin: "https://kwik.cx" },
      { Referer: "https://animepahe.pw/" },
      { Referer: `${parsed.origin}/` },
      {}
    ];

    if (req.headers.range) {
      for (const profile of headerProfiles) profile.Range = req.headers.range;
    }

    let upstream = null;
    let lastFailure = null;
    const cookieProfiles = cookieCandidates.length ? cookieCandidates : [null];

    for (const cookie of cookieProfiles) {
      for (const profile of headerProfiles) {
        const headers = { ...profile };
        if (cookie) headers.Cookie = cookie;
        try {
          const candidate = await tryFetch(target, headers);
          if (candidate.status < 400) {
            upstream = candidate;
            break;
          }

          const chunks = [];
          for await (const chunk of candidate.data) {
            chunks.push(chunk);
            if (chunks.reduce((n, b) => n + b.length, 0) >= 2048) break;
          }
          const preview = Buffer.concat(chunks).toString("utf8", 0, 2048);
          lastFailure = { status: candidate.status, preview, headers };
          console.warn(`[download-proxy] blocked status=${candidate.status} host=${host} referer=${headers.Referer || "-"} cookie=${cookie ? "yes" : "no"}`);
        } catch (err) {
          lastFailure = { status: 0, preview: err.message, headers };
          console.warn(`[download-proxy] request failed host=${host} referer=${headers.Referer || "-"} cookie=${cookie ? "yes" : "no"} err=${err.message}`);
        }
      }
      if (upstream) break;
    }

    if (!upstream) {
      const preview = String(lastFailure?.preview || "").slice(0, 200).replace(/\s+/g, " ");
      console.error(`[download-proxy] upstream blocked: status=${lastFailure?.status || 0} host=${host} preview=${preview}`);
      return res.status(502).json({ error: "download upstream blocked" });
    }

    const passthrough = [
      "content-type", "content-length", "content-disposition",
      "accept-ranges", "content-range", "etag", "last-modified"
    ];
    for (const key of passthrough) {
      const value = upstream.headers[key];
      if (value) res.setHeader(key, value);
    }

    res.status(upstream.status);
    upstream.data.pipe(res);
  } catch (err) {
    console.error(`[download-proxy] fatal: ${err.message}`);
    res.status(500).json({ error: err.message || "proxy failure" });
  }
});

app.listen(PORT, () => {
  console.log(`download proxy listening on port ${PORT}`);
});
