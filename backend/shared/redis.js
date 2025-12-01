const Redis = require('ioredis');

let redisClient = null;

// Performance tracker: Store average cache miss times per cache key pattern
// Format: { 'user:': { avgTime: 150, count: 10 }, 'flight:': { avgTime: 200, count: 5 } }
const performanceTracker = {};

/**
 * Get cache key pattern from full key (e.g., 'user:123' -> 'user:')
 * @param {string} key - Full cache key
 * @returns {string} Cache key pattern
 */
function getCacheKeyPattern(key) {
  const colonIndex = key.indexOf(':');
  return colonIndex > 0 ? key.substring(0, colonIndex + 1) : key;
}

/**
 * Record a cache miss time for performance tracking
 * @param {string} key - Cache key
 * @param {number} totalTime - Total time in milliseconds (DB + cache write)
 */
function recordCacheMiss(key, totalTime) {
  const pattern = getCacheKeyPattern(key);
  if (!performanceTracker[pattern]) {
    performanceTracker[pattern] = { avgTime: totalTime, count: 1 };
  } else {
    // Calculate rolling average (keep last 20 samples for accuracy)
    const tracker = performanceTracker[pattern];
    const maxSamples = 20;
    if (tracker.count < maxSamples) {
      // Simple average for first 20 samples
      tracker.avgTime = (tracker.avgTime * tracker.count + totalTime) / (tracker.count + 1);
      tracker.count++;
    } else {
      // Rolling average: remove oldest, add newest
      tracker.avgTime = (tracker.avgTime * (maxSamples - 1) + totalTime) / maxSamples;
    }
  }
}

/**
 * Calculate speedup factor for a cache hit
 * @param {string} key - Cache key
 * @param {number} cacheHitTime - Cache hit time in milliseconds
 * @returns {string|null} Speedup string (e.g., "10X faster") or null if no baseline
 */
function calculateSpeedup(key, cacheHitTime) {
  const pattern = getCacheKeyPattern(key);
  const tracker = performanceTracker[pattern];
  
  if (!tracker || tracker.count === 0) {
    return null; // No baseline yet
  }
  
  const avgMissTime = tracker.avgTime;
  if (avgMissTime <= cacheHitTime) {
    return null; // Cache hit wasn't faster (shouldn't happen, but handle gracefully)
  }
  
  const speedup = avgMissTime / cacheHitTime;
  
  // Format speedup nicely
  if (speedup >= 100) {
    return `${Math.round(speedup)}X faster`;
  } else if (speedup >= 10) {
    return `${speedup.toFixed(1)}X faster`;
  } else if (speedup >= 2) {
    return `${speedup.toFixed(1)}X faster`;
  } else {
    return `${speedup.toFixed(1)}X faster`;
  }
}

/**
 * Get or create Redis client instance
 * @returns {Redis} Redis client instance
 */
function getRedisClient() {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  };

  // Add password if provided
  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    console.log('✅ Redis client connected');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis client ready');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis client error:', err.message);
  });

  redisClient.on('close', () => {
    console.log('⚠️ Redis client connection closed');
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis client reconnecting...');
  });

  return redisClient;
}

/**
 * Connect to Redis
 * @returns {Promise<void>}
 */
async function connectRedis() {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      await client.connect();
    }
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error.message);
    console.log('⚠️ Service will continue without Redis caching');
  }
}

/**
 * Disconnect from Redis
 * @returns {Promise<void>}
 */
async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis disconnected');
  }
}

/**
 * Cache helper: Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<{value: any, time: number}|null>} Cached value with timing or null
 */
async function getCache(key) {
  const startTime = Date.now();
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      return null;
    }
    const value = await client.get(key);
    const time = Date.now() - startTime;
    return value ? { value: JSON.parse(value), time } : null;
  } catch (error) {
    console.error(`❌ Redis get error for key ${key}:`, error.message);
    return null;
  }
}

/**
 * Cache helper: Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<boolean>} Success status
 */
async function setCache(key, value, ttl = 300) {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      return false;
    }
    await client.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`❌ Redis set error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Cache helper: Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function deleteCache(key) {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      return false;
    }
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`❌ Redis delete error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Cache helper: Delete multiple keys by pattern
 * @param {string} pattern - Pattern to match (e.g., 'user:*')
 * @returns {Promise<number>} Number of keys deleted
 */
async function deleteCacheByPattern(pattern) {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      return 0;
    }
    const keys = await client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return await client.del(...keys);
  } catch (error) {
    console.error(`❌ Redis delete pattern error for ${pattern}:`, error.message);
    return 0;
  }
}

/**
 * Cache helper: Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} True if key exists
 */
async function existsCache(key) {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      return false;
    }
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`❌ Redis exists error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Cache helper: Get TTL (time to live) for a key
 * @param {string} key - Cache key
 * @returns {Promise<number>} TTL in seconds, -1 if no expiry, -2 if key doesn't exist
 */
async function getTTL(key) {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      return -2;
    }
    return await client.ttl(key);
  } catch (error) {
    console.error(`❌ Redis TTL error for key ${key}:`, error.message);
    return -2;
  }
}

module.exports = {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  existsCache,
  getTTL,
  recordCacheMiss,
  calculateSpeedup,
};

