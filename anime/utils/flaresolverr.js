const SESSION_BASE = "animepahe";
const MAX_TIMEOUT = parseInt(
  process.env.FLARESOLVERR_MAX_TIMEOUT || "60000",
  10,
);
const MAX_PROXY_ROTATIONS = parseInt(
  process.env.FLARESOLVERR_PROXY_MAX_ROTATIONS || "6",
  10,
);

let stickyToken = newStickyToken();

function newStickyToken() {
  return (
    "r" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 6)
  );
}

function proxyConfig() {
  const raw = process.env.FLARESOLVERR_PROXY;
  if (!raw) return null;

  let url = raw;
  let username;
  let password = "";

  try {
    const parsed = new URL(raw);
    url = `${parsed.protocol}//${parsed.host}`;
    if (parsed.username) username = decodeURIComponent(parsed.username);
    if (parsed.password) password = decodeURIComponent(parsed.password);
  } catch (_) {
    return { url: raw };
  }

  const sticky = process.env.FLARESOLVERR_PROXY_STICKY;
  if (sticky) password += sticky.replace("{id}", stickyToken);

  const cfg = { url };
  if (username) cfg.username = username;
  if (password) cfg.password = password;
  return cfg;
}

function proxyHostTokens() {
  const raw = process.env.FLARESOLVERR_PROXY_HOSTS;
  if (raw === undefined) return ["kwik"];
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "*") return ["*"];
  return trimmed
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function shouldProxy(url) {
  if (!proxyConfig()) return false;
  const tokens = proxyHostTokens();
  if (tokens.includes("*")) return true;

  let host = "";
  try {
    host = new URL(url).host.toLowerCase();
  } catch (_) {}

  return tokens.some((t) => host.includes(t));
}

const sessions = new Map();
const locks = new Map();

function sessionKey(useProxy) {
  return useProxy ? `${SESSION_BASE}-proxy-${stickyToken}` : SESSION_BASE;
}

function runExclusive(cacheKey, fn) {
  const prev = locks.get(cacheKey) || Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(cacheKey, run.then(() => {}, () => {}));
  return run;
}

function isEnabled() {
  return !!process.env.FLARESOLVERR_URL;
}

function endpoint() {
  return process.env.FLARESOLVERR_URL.replace(/\/+$/, "") + "/v1";
}

async function postV1(payload) {
  const controller = new AbortController();
  const httpTimeout = MAX_TIMEOUT + 15000;
  const timer = setTimeout(() => controller.abort(), httpTimeout);

  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!data) {
      throw new Error(
        `FlareSolverr returned non-JSON (HTTP ${res.status})`,
      );
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        `FlareSolverr request timed out after ${httpTimeout}ms`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureSession(useProxy) {
  const cacheKey = useProxy ? "proxy" : "direct";
  if (sessions.has(cacheKey)) return sessions.get(cacheKey);

  const promise = (async () => {
    const name = sessionKey(useProxy);
    const payload = { cmd: "sessions.create", session: name };
    if (useProxy) payload.proxy = proxyConfig();

    try {
      const data = await postV1(payload);
      if (
        data.status !== "ok" &&
        !/already exists/i.test(data.message || "")
      ) {
        throw new Error(
          `FlareSolverr sessions.create failed: ${data.message || data.status}`,
        );
      }
      console.log(
        `[flaresolverr] session "${name}" ready${useProxy ? " (via proxy)" : ""}`,
      );
      return name;
    } catch (err) {
      sessions.delete(cacheKey);
      throw err;
    }
  })();

  sessions.set(cacheKey, promise);
  return promise;
}

function resetSession(useProxy) {
  sessions.delete(useProxy ? "proxy" : "direct");
}

async function destroySession(name) {
  try {
    await postV1({ cmd: "sessions.destroy", session: name });
  } catch (_) {}
}

async function rotateProxyIp() {
  const oldName = sessionKey(true);
  await destroySession(oldName);
  resetSession(true);
  stickyToken = newStickyToken();
  console.log("[flaresolverr] rotated proxy IP (sticky token refreshed)");
}

async function solveOnce(useProxy, makePayload) {
  let session = await ensureSession(useProxy);
  let data = await postV1(makePayload(session));

  if (
    data.status !== "ok" &&
    /session.*(not.*exist|no.*found)/i.test(data.message || "")
  ) {
    resetSession(useProxy);
    session = await ensureSession(useProxy);
    data = await postV1(makePayload(session));
  }

  return data;
}

function toResult(data) {
  return {
    status: data.solution.status,
    body: data.solution.response,
    cookies: data.solution.cookies || [],
    userAgent: data.solution.userAgent,
  };
}

function looksLikeBrowserError(body) {
  if (typeof body !== "string") return false;
  return /id=["']main-frame-error["']|chrome-error:\/\/|--error-code-color|ERR_(TIMED_OUT|TUNNEL_CONNECTION_FAILED|PROXY_CONNECTION_FAILED|CONNECTION_(RESET|CLOSED|TIMED_OUT)|EMPTY_RESPONSE|NAME_NOT_RESOLVED)/i.test(
    body,
  );
}

function solutionError(data, url) {
  const status = data?.solution?.status;
  const msg = data?.message || data?.status || "unknown error";
  const err = new Error(`FlareSolverr failed for ${url}: ${msg}`);
  err.statusCode = status && status >= 400 ? status : 503;
  return err;
}

async function get(url) {
  const useProxy = shouldProxy(url);
  const cacheKey = useProxy ? "proxy" : "direct";

  return runExclusive(cacheKey, async () => {
    const maxAttempts = useProxy ? MAX_PROXY_ROTATIONS + 1 : 1;
    let lastErr;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let data;
      try {
        data = await solveOnce(useProxy, (session) => {
          const payload = {
            cmd: "request.get",
            url,
            session,
            maxTimeout: MAX_TIMEOUT,
          };
          if (useProxy) payload.proxy = proxyConfig();
          return payload;
        });
      } catch (err) {
        lastErr = err;
        if (useProxy && attempt < maxAttempts) {
          await rotateProxyIp();
          continue;
        }
        throw err;
      }

      if (data.status === "ok" && data.solution) {
        if (useProxy && looksLikeBrowserError(data.solution.response)) {
          lastErr = new Error(
            `FlareSolverr returned a browser error page for ${url} (proxy load failed)`,
          );
          if (attempt < maxAttempts) {
            console.log(
              `[flaresolverr] solved but page failed to load on attempt ${attempt}, rotating...`,
            );
            await rotateProxyIp();
            continue;
          }
          throw lastErr;
        }
        if (useProxy && attempt > 1) {
          console.log(
            `[flaresolverr] solved after trying ${attempt} proxy IP(s)`,
          );
        }
        return toResult(data);
      }

      lastErr = solutionError(data, url);
      if (useProxy && attempt < maxAttempts) {
        console.log(
          `[flaresolverr] proxy IP blocked on attempt ${attempt}, rotating...`,
        );
        await rotateProxyIp();
        continue;
      }

      throw lastErr;
    }

    throw lastErr || new Error(`FlareSolverr failed for ${url}`);
  });
}

async function post(url, postData = {}) {
  const useProxy = shouldProxy(url);
  const cacheKey = useProxy ? "proxy" : "direct";

  return runExclusive(cacheKey, async () => {
    let session = await ensureSession(useProxy);
    let data = await postV1({
      cmd: "request.post",
      url,
      session,
      postData,
      maxTimeout: MAX_TIMEOUT,
      ...(useProxy ? { proxy: proxyConfig() } : {}),
    });

    if (
      data.status !== "ok" &&
      /session.*(not.*exist|no.*found)/i.test(data.message || "")
    ) {
      resetSession(useProxy);
      session = await ensureSession(useProxy);
      data = await postV1({
        cmd: "request.post",
        url,
        session,
        postData,
        maxTimeout: MAX_TIMEOUT,
        ...(useProxy ? { proxy: proxyConfig() } : {}),
      });
    }

    if (data.status === "ok" && data.solution) {
      return toResult(data);
    }

    throw solutionError(data, url);
  });
}

function extractJson(body) {
  if (typeof body !== "string") return body;

  const preMatch = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) return JSON.parse(preMatch[1].trim());

  const bodyMatch = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return JSON.parse(bodyMatch[1].trim());

  return JSON.parse(body);
}

async function fetchCookies(url) {
  if (!isEnabled()) return "";
  const useProxy = shouldProxy(url);
  const data = await solveOnce(useProxy, (session) => ({
    cmd: "request.get",
    url,
    session,
    maxTimeout: MAX_TIMEOUT,
  }));
  if (data.status !== "ok" || !data.solution) {
    throw solutionError(data, url);
  }
  const cookies = data.solution.cookies || [];
  const header = cookies
    .filter((c) => c.name && c.value)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  if (!header) throw new Error("FlareSolverr returned no cookies");
  return header;
}

module.exports = {
  isEnabled,
  get,
  post,
  fetchCookies,
  extractJson,
};
