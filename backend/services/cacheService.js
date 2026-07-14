import cacheConfig from '../config/cacheConfig.js';
import { PerfTracker } from '../utils/perfTracker.js';

/**
 * CacheService - Simple in-memory cache with TTL (Time To Live) support
 * and Promise-level request deduplication.
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.pendingPromises = new Map();
    // Default TTL of 5 minutes (300 seconds)
    this.DEFAULT_TTL = 300;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Expose cache performance statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? this.hits / total : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      ratio
    };
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
    if (process.env.NODE_ENV !== 'production') {
      console.time("Cache");
    }

    try {
      if (!this.cache.has(key)) {
        this.misses++;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Cache Service] CACHE MISS - Key: ${key}`);
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
          console.log(`[Cache Service] CACHE MISS - Key: ${key} (Expired)`);
          PerfTracker.increment('cacheMisses');
        }
        return null;
      }

      this.hits++;
      if (process.env.NODE_ENV !== 'production') {
        const ttlRemaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        console.log(`[Cache Service] CACHE HIT - Key: ${key} - TTL Remaining: ${ttlRemaining}s`);
        PerfTracker.increment('cacheHits');
        PerfTracker.setCacheStatus('HIT');
      }
      return value;
    } finally {
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd("Cache");
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
  }

  /**
   * Delete specific key from cache
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Flush/clear all items from cache
   */
  flush() {
    this.cache.clear();
    this.pendingPromises.clear();
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
   * Background cleanup of expired items (optional)
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
