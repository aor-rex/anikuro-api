const crypto = require("crypto");

const ApiKey = (req, res, next) => {
  // FIX Bug #23: Require API key from env, no hardcoded default
  let expectedKey = process.env.API_KEY;

  // If no key configured, generate one and warn (dev mode only)
  if (!expectedKey) {
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json({
        error: "Server misconfiguration",
        message: "API_KEY environment variable not set",
      });
    }
    // Dev mode: use predictable key with warning
    console.warn(
      "[apiKeyMiddleware] ⚠️  No API_KEY set. Using default key for development.",
    );
    console.warn("[apiKeyMiddleware] Set API_KEY in .env file for security.");
    expectedKey = "dev-key-change-me";
  }

  const providedKey = req.headers["x-api-key"];

  // Skip auth for health check, OPTIONS, and docs
  if (req.path === "/health" || req.method === "OPTIONS") {
    return next();
  }

  // FIX Bug #22: Use timing-safe comparison
  if (!providedKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key required. Send it in the x-api-key header.",
    });
  }

  const providedBuf = Buffer.from(providedKey, "utf8");
  const expectedBuf = Buffer.from(expectedKey, "utf8");

  // Pad to same length to prevent timing attacks
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
    });
  }

  next();
};

module.exports = ApiKey;
