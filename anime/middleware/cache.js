const redis = require('../utils/redis');
const diskCache = require('../utils/diskCache');

const cache = (duration) => async (req, res, next) => {
    try {
        // Build a normalized cache key: path + sorted query params
        let key = req.path;
        const queryKeys = Object.keys(req.query);
        if (queryKeys.length > 0) {
            const sortedQuery = queryKeys
                .sort()
                .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(req.query[k])}`)
                .join('&');
            key += `?${sortedQuery}`;
        }

        // Try Redis first (if enabled)
        if (redis.enabled) {
            const cachedResponse = await redis.get(key);
            if (cachedResponse) {
                console.log(`[Cache] ✅ Redis HIT: ${key.substring(0, 60)}...`);
                return res.json(JSON.parse(cachedResponse));
            }
        }

        // Fallback to disk cache when Redis is disabled or miss
        if (!redis.enabled) {
            const diskCached = await diskCache.get(key);
            if (diskCached !== null) {
                console.log(`[Cache] ✅ Disk HIT: ${key.substring(0, 60)}...`);
                return res.json(diskCached);
            }
        }

        // No cache hit — proceed and cache the result
        const originalJson = res.json;

        res.json = async function(data) {
            // Cache in Redis if enabled
            if (redis.enabled) {
                await redis.setEx(key, duration, JSON.stringify(data));
            }

            // Always cache to disk as fallback (even if Redis is enabled — double layer)
            if (!redis.enabled) {
                await diskCache.set(key, data, duration);
            }

            return originalJson.call(this, data);
        };

        next();
    } catch (error) {
        console.error('Cache error:', error);
        next();
    }
};

module.exports = cache;