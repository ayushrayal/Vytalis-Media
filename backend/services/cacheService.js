/**
 * CacheService - Simple in-memory cache with TTL (Time To Live) support
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    // Default TTL of 5 minutes (300 seconds)
    this.DEFAULT_TTL = 300;
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
    if (!this.cache.has(key)) {
      return null;
    }

    const { value, expiresAt } = this.cache.get(key);

    // If expired, delete and return null
    if (Date.now() > expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return value;
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
