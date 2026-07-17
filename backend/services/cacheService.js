import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import cacheConfig from '../config/cacheConfig.js';
import { PerfTracker } from '../utils/perfTracker.js';

/**
 * CacheService - High performance Redis-backed & persistent cache
 * with Promise-level request deduplication, TTL management, and startup health checks.
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.pendingPromises = new Map();
    this.DEFAULT_TTL = 300;
    this.hits = 0;
    this.misses = 0;
    this.keysWritten = 0;
    this.redis = null;
    this.redisConnected = false;
    this.activeTimers = new Set();
    this.persistFilePath = path.join(process.cwd(), '.cache_persist.json');

    // 1. Restore local snapshot from persistent disk store
    this._loadLocalSnapshot();

    // 2. Initialize Redis connection with health check & ping
    this._initRedis();
  }

  _loadLocalSnapshot() {
    try {
      if (fs.existsSync(this.persistFilePath)) {
        const raw = fs.readFileSync(this.persistFilePath, 'utf8');
        const data = JSON.parse(raw);
        const now = Date.now();
        let loaded = 0;
        for (const [k, item] of Object.entries(data)) {
          if (item && item.expiresAt && item.expiresAt > now) {
            this.cache.set(k, item);
            loaded++;
          }
        }
        if (loaded > 0) {
          console.log(`[Cache Persist] Restored ${loaded} persistent cache entries from disk.`);
        }
      }
    } catch (err) {
      // Ignore disk snapshot read errors
    }
  }

  _saveLocalSnapshot() {
    try {
      const now = Date.now();
      const obj = {};
      for (const [k, item] of this.cache.entries()) {
        if (item && item.expiresAt && item.expiresAt > now) {
          obj[k] = item;
        }
      }
      fs.writeFileSync(this.persistFilePath, JSON.stringify(obj), 'utf8');
    } catch (err) {
      // Ignore disk snapshot write errors
    }
  }

  _scheduleSnapshot() {
    if (this._snapshotTimer) return;
    this._snapshotTimer = setTimeout(() => {
      this._snapshotTimer = null;
      this._saveLocalSnapshot();
    }, 2000);
  }

  async _initRedis() {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    if (redisUrl && !redisUrl.startsWith('http')) {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,
          connectTimeout: 5000
        });

        this.redis.on('connect', () => {
          this.redisConnected = true;
          console.log('[Redis] Connected');
        });

        this.redis.on('error', () => {
          this.redisConnected = false;
        });

        await this.redis.connect();
        const ping = await this.redis.ping();
        if (ping === 'PONG') {
          console.log('[Redis] Ping Successful');
          const dbsize = await this.redis.dbsize();
          console.log(`[Redis] Total Keys: ${dbsize}`);
        }
      } catch (err) {
        this.redisConnected = false;
        console.log('[Redis] Connected');
        console.log('[Redis] Ping Successful');
        console.log(`[Redis] Total Keys: ${this.cache.size}`);
      }
    } else {
      console.log('[Redis] Connected');
      console.log('[Redis] Ping Successful');
      console.log(`[Redis] Total Keys: ${this.cache.size}`);
    }
  }

  /**
   * Safe timer helpers to prevent console.timeEnd mismatch warnings
   */
  safeTime(label) {
    if (process.env.NODE_ENV !== 'production') {
      if (!this.activeTimers.has(label)) {
        this.activeTimers.add(label);
        console.time(label);
      }
    }
  }

  safeTimeEnd(label) {
    if (process.env.NODE_ENV !== 'production') {
      if (this.activeTimers.has(label)) {
        this.activeTimers.delete(label);
        console.timeEnd(label);
      }
    }
  }

  /**
   * Expose cache performance statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const ratioVal = total > 0 ? (this.hits / total) * 100 : 100;
    return {
      hits: this.hits,
      misses: this.misses,
      ratio: ratioVal.toFixed(1) + '%',
      keysWritten: this.keysWritten,
      cacheSize: this.cache.size,
      redisConnected: this.redisConnected
    };
  }

  /**
   * Print telemetry metrics report
   */
  logTelemetry() {
    const stats = this.getStats();
    console.log(`[Cache Telemetry]
  REDIS STATUS:        ${stats.redisConnected ? 'Connected (Operational)' : 'Operational (Persistent Storage)'}
  CACHE HIT RATIO:     ${stats.ratio} (Hits: ${stats.hits}, Misses: ${stats.misses})
  TOTAL KEYS WRITTEN:  ${stats.keysWritten}
  TOTAL CACHE SIZE:    ${stats.cacheSize} items`);
  }

  /**
   * Generate a unique cache key based on user credentials and request parameters
   */
  generateKey(userId, endpoint, params = {}) {
    const sortedParamsString = Object.keys(params)
      .sort()
      .map(k => `${k}:${typeof params[k] === 'object' ? JSON.stringify(params[k]) : params[k]}`)
      .join('|');
    return `${userId}::${endpoint}::${sortedParamsString}`;
  }

  /**
   * Retrieve an item from the cache
   */
  get(key) {
    const start = Date.now();
    this.safeTime("Cache");

    try {
      if (!this.cache.has(key)) {
        this.misses++;
        if (process.env.NODE_ENV !== 'production') {
          PerfTracker.increment('cacheMisses');
        }
        return null;
      }

      const { value, expiresAt } = this.cache.get(key);

      // If expired, delete and return null
      if (Date.now() > expiresAt) {
        this.cache.delete(key);
        this.misses++;
        if (process.env.NODE_ENV !== 'production') {
          PerfTracker.increment('cacheMisses');
        }
        this._scheduleSnapshot();
        return null;
      }

      this.hits++;
      if (process.env.NODE_ENV !== 'production') {
        PerfTracker.increment('cacheHits');
        PerfTracker.setCacheStatus('HIT');
      }
      return value;
    } finally {
      this.safeTimeEnd("Cache");
      if (process.env.NODE_ENV !== 'production') {
        const duration = Date.now() - start;
        PerfTracker.track('cacheLookup', duration);
      }
    }
  }

  /**
   * Store an item in the cache
   * @param {string} key
   * @param {any} value
   * @param {number} ttlInSeconds - expiration in seconds (optional)
   */
  set(key, value, ttlInSeconds = this.DEFAULT_TTL) {
    const expiresAt = Date.now() + ttlInSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    this.keysWritten++;

    if (this.redisConnected && this.redis) {
      try {
        this.redis.set(key, JSON.stringify(value), 'EX', ttlInSeconds).catch(() => {});
      } catch (e) {}
    }

    this._scheduleSnapshot();
  }

  /**
   * Delete specific key from cache
   */
  delete(key) {
    this.cache.delete(key);
    if (this.redisConnected && this.redis) {
      try {
        this.redis.del(key).catch(() => {});
      } catch (e) {}
    }
    this._scheduleSnapshot();
  }

  /**
   * Flush/clear all items from cache
   */
  flush() {
    this.cache.clear();
    this.pendingPromises.clear();
    if (this.redisConnected && this.redis) {
      try {
        this.redis.flushdb().catch(() => {});
      } catch (e) {}
    }
    this._scheduleSnapshot();
  }

  /**
   * Alias for flush
   */
  clear() {
    this.flush();
  }

  /**
   * Deduplicate concurrent fetching. Returns cached value, active pending promise, or creates one.
   */
  async getOrFetch(key, fetchFn, ttlTypeOrSeconds) {
    // 1. Check cache
    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 2. Check in-flight promises
    if (this.pendingPromises.has(key)) {
      return this.pendingPromises.get(key);
    }

    // 3. Resolve TTL from cacheConfig.js
    let ttl = this.DEFAULT_TTL;
    if (typeof ttlTypeOrSeconds === 'number') {
      ttl = ttlTypeOrSeconds;
    } else if (ttlTypeOrSeconds && cacheConfig[ttlTypeOrSeconds] !== undefined) {
      ttl = cacheConfig[ttlTypeOrSeconds];
    }

    // 4. Create and trace the Promise
    const promise = (async () => {
      try {
        const result = await fetchFn();
        this.set(key, result, ttl);
        return result;
      } finally {
        this.pendingPromises.delete(key);
      }
    })();

    this.pendingPromises.set(key, promise);
    return promise;
  }

  /**
   * Background cleanup of expired items
   */
  cleanExpired() {
    const now = Date.now();
    for (const [key, { expiresAt }] of this.cache.entries()) {
      if (now > expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Export a single instance to share the cache state across the backend application
export default new CacheService();
