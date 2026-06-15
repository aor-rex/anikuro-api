const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const HomeModel = require("../models/homeModel");
const PlayModel = require("../models/playModel");

const STATE_PATH = process.env.WEBHOOK_STATE_PATH || path.join("/tmp", "anime-webhook-state.json");
const POLL_MS = Math.max(parseInt(process.env.WEBHOOK_POLL_MS || "600000", 10), 60000);
const DOWNLOAD_PROXY_BASE = String(process.env.DOWNLOAD_PROXY_BASE || "").trim().replace(/\/+$/, "");

let interval = null;
let running = false;
let sentState = new Set();
let loaded = false;

function isEnabled() {
  return !!(process.env.WEBHOOK_URL && process.env.WEBHOOK_SECRET);
}

function buildKey(item) {
  return [
    item.anime_session || "",
    item.episode_session || "",
    item.episode || "",
  ].join(":");
}

function buildProxyUrl(url) {
  if (!url) return url;
  if (!DOWNLOAD_PROXY_BASE) return url;
  return `${DOWNLOAD_PROXY_BASE}/api/anime/download-proxy?url=${encodeURIComponent(url)}`;
}

async function loadState() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sent)) {
      sentState = new Set(parsed.sent);
    }
  } catch (_) {
    sentState = new Set();
  }
}

async function saveState() {
  try {
    const payload = JSON.stringify({ sent: Array.from(sentState).slice(-1000) });
    await fs.writeFile(STATE_PATH, payload, "utf8");
  } catch (err) {
    console.error("[webhook] state save failed:", err.message);
  }
}

async function postWebhook(payload) {
  const res = await axios.post(process.env.WEBHOOK_URL, payload, {
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": process.env.WEBHOOK_SECRET,
    },
    validateStatus: () => true,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`webhook HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
  }

  return res.data;
}

async function buildPayload(item) {
  if (!item.anime_session || !item.episode_session) return null;

  const detail = await PlayModel.getStreamingLinks(item.anime_session, item.episode_session, true);
  const downloads = Array.isArray(detail?.downloads) ? detail.downloads : [];
  const usable = downloads
    .map((dl) => ({
      quality: dl.quality || dl.resolution || null,
      filesize: dl.filesize || dl.size || null,
      isDub: Boolean(dl.isDub || dl.dub),
      url: buildProxyUrl(dl.download || dl.url || null),
    }))
    .filter((dl) => dl.url);

  if (!usable.length) return null;

  return {
    anime_id: item.anime_id || null,
    anime_session: item.anime_session || null,
    episode: item.episode || null,
    episode_session: item.episode_session || null,
    title: detail?.anime_title || item.title || null,
    image: item.image || null,
    created_at: item.created_at || null,
    downloads: usable,
  };
}

async function tick() {
  return runTick({});
}

async function runTick(options = {}) {
  if (running || !isEnabled()) return;
  running = true;
  let seen = 0;
  let delivered = 0;
  let missingEpisodeSession = 0;
  let alreadySent = 0;
  let unresolvedDownloads = 0;
  let matchedTarget = 0;

  try {
    await loadState();
    const airing = await HomeModel.getAiringAnime(1);
    const items = Array.isArray(airing?.data) ? airing.data : [];
    const targetSession = String(options.animeSession || "").trim() || null;

    for (const item of items) {
      if (targetSession && String(item.anime_session || "") !== targetSession) continue;
      matchedTarget += 1;
      const key = buildKey(item);
      if (!item.episode_session) {
        missingEpisodeSession += 1;
        console.warn(`[webhook] skip missing episode_session: ${item.anime_session || "unknown"} ep=${item.episode || "?"}`);
        continue;
      }
      seen += 1;
      if (sentState.has(key)) {
        alreadySent += 1;
        continue;
      }

      try {
        const payload = await buildPayload(item);
        if (!payload) {
          unresolvedDownloads += 1;
          console.warn(`[webhook] skip unresolved downloads: ${item.title || item.anime_title || item.anime_session}`);
          continue;
        }

        const result = await postWebhook(payload);
        console.log(`[webhook] delivered ${key} matched=${result?.matched ?? "?"} delivered=${result?.delivered ?? "?"}`);
        sentState.add(key);
        delivered += Number(result?.delivered || 0);
        if (sentState.size > 1000) {
          sentState = new Set(Array.from(sentState).slice(-1000));
        }
        await saveState();
      } catch (err) {
        console.error(`[webhook] failed ${key}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[webhook] tick failed:", err.message);
    throw err;
  } finally {
    running = false;
  }

  return {
    matchedTarget,
    seen,
    delivered,
    missingEpisodeSession,
    alreadySent,
    unresolvedDownloads,
  };
}

function startWebhookNotifier() {
  if (!isEnabled()) {
    console.log("[webhook] disabled (set WEBHOOK_URL and WEBHOOK_SECRET to enable)");
    return;
  }
  if (interval) return;
  console.log(`[webhook] enabled -> ${process.env.WEBHOOK_URL}`);
  tick().catch(() => {});
  interval = setInterval(() => {
    tick().catch(() => {});
  }, POLL_MS);
}

module.exports = {
  startWebhookNotifier,
  runTick,
};
