const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { existsSync } = require("fs");

// Cache directory — use /tmp for ephemeral storage (HF Spaces compatible)
const CACHE_DIR = process.env.DISK_CACHE_DIR || path.join("/tmp", "anikuro-cache");

let initialized = false;

/**
 * Initialize the disk cache directory. Creates it if it doesn't exist.
 */
async function init() {
  if (initialized) return;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    initialized = true;
    console.log(`[Disk Cache] Initialized at: ${CACHE_DIR}`);
  } catch (error) {
    console.error("[Disk Cache] Failed to initialize cache directory:", error.message);
    // Don't throw — cache is optional, app should still work
  }
}

/**
 * Hash a cache key into a safe filename.
 */
function hashKey(key) {
  return crypto.createHash("md5").update(key).digest("hex");
}

/**
 * Get a cached response from disk.
 * Returns null if not found or expired.
 */
async function get(key) {
  if (!initialized) await init();

  try {
    const filePath = path.join(CACHE_DIR, hashKey(key) + ".json");
    if (!existsSync(filePath)) return null;

    const raw = await fs.readFile(filePath, "utf8");
    const entry = JSON.parse(raw);

    // Check expiration
    if (Date.now() - entry.timestamp > entry.duration * 1000) {
      // Expired — delete it
      await fs.unlink(filePath).catch(() => {});
      return null;
    }

    console.log(`[Disk Cache] ✅ HIT: ${key.substring(0, 60)}...`);
    return entry.data;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[Disk Cache] Get error:", error.message);
    }
    return null;
  }
}

/**
 * Set a cached response on disk with TTL.
 */
async function set(key, data, duration) {
  if (!initialized) await init();

  try {
    const filePath = path.join(CACHE_DIR, hashKey(key) + ".json");
    const entry = {
      data,
      timestamp: Date.now(),
      duration, // in seconds
    };

    await fs.writeFile(filePath, JSON.stringify(entry), "utf8");
    console.log(`[Disk Cache] 💾 SET: ${key.substring(0, 60)}...`);
  } catch (error) {
    console.error("[Disk Cache] Set error:", error.message);
    // Don't throw — cache failures should not break the app
  }
}

/**
 * Delete a specific cache entry.
 */
async function del(key) {
  if (!initialized) await init();

  try {
    const filePath = path.join(CACHE_DIR, hashKey(key) + ".json");
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error("[Disk Cache] Delete error:", error.message);
  }
}

/**
 * Clean all expired cache entries.
 */
async function cleanExpired() {
  if (!initialized) await init();

  try {
    const files = await fs.readdir(CACHE_DIR);
    let cleaned = 0;

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(CACHE_DIR, file);
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const entry = JSON.parse(raw);

        if (Date.now() - entry.timestamp > entry.duration * 1000) {
          await fs.unlink(filePath);
          cleaned++;
        }
      } catch {
        // Corrupted file — delete it
        await fs.unlink(filePath).catch(() => {});
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Disk Cache] Cleaned ${cleaned} expired entries`);
    }
  } catch (error) {
    console.error("[Disk Cache] Clean error:", error.message);
  }
}

/**
 * Get cache statistics (file count, total size).
 */
async function stats() {
  if (!initialized) await init();

  try {
    const files = await fs.readdir(CACHE_DIR);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    let totalSize = 0;
    for (const file of jsonFiles) {
      const filePath = path.join(CACHE_DIR, file);
      const stat = await fs.stat(filePath);
      totalSize += stat.size;
    }

    return {
      entries: jsonFiles.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    };
  } catch (error) {
    return { entries: 0, totalSizeBytes: 0, totalSizeMB: "0.00" };
  }
}

// Auto-clean expired entries on startup (non-blocking)
init().then(() => {
  cleanExpired();
});

module.exports = {
  init,
  get,
  set,
  del,
  cleanExpired,
  stats,
  CACHE_DIR,
};
