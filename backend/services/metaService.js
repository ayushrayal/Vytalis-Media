import encryption from '../utils/encryption.js';
import metaApi from '../config/metaApi.js';
import { getBaseField, fieldMap } from '../config/metaFields.js';
import Logger from '../utils/logger.js';

/**
 * Lightweight concurrency queue to cap simultaneous Graph API requests
 */
class ConcurrencyQueue {
  constructor(limit = 5) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async run(task) {
    const queueWaitStart = Date.now();
    const queueSizeBefore = this.queue.length;

    if (this.running >= this.limit) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.running++;
    const queueWaitTime = Date.now() - queueWaitStart;

    try {
      return await task({ queueWaitTime, queueSize: queueSizeBefore });
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

const metaQueue = new ConcurrencyQueue(5);

/**
 * MetaService - Low-level Graph API communication client with validation, queueing, and retry management
 */
class MetaService {
  static get BASE_URL() {
    return `https://graph.facebook.com/${metaApi.version}`;
  }

  /**
   * Helper to execute a Graph API request with queue limits and retry handling
   */
  static async request(endpoint, user, options = {}) {
    if (!user) {
      const err = new Error('No user context provided for Meta Ads API request.');
      err.errorType = 'META_API_ERROR';
      throw err;
    }

    if (!user.metaAccountId || !user.metaAccessToken) {
      const err = new Error('Meta Ad Account ID or Access Token is missing. Please update your profile.');
      err.errorType = 'META_API_ERROR';
      throw err;
    }

    let accessToken;
    try {
      accessToken = encryption.decrypt(user.metaAccessToken);
    } catch (decryptError) {
      const err = new Error('Failed to decrypt Meta Access Token. Please re-enter your token in profile settings.');
      err.errorType = 'META_API_ERROR';
      err.originalError = decryptError;
      throw err;
    }

    const { method = 'GET', params = {}, body = null, resourceType = null } = options;

    // --- FIELD VALIDATION LAYER ---
    const warnings = [];
    if (resourceType && params.fields) {
      const allowedFields = fieldMap[resourceType];
      if (allowedFields) {
        const requestedFields = Array.isArray(params.fields)
          ? params.fields
          : typeof params.fields === 'string'
            ? params.fields.split(',')
            : [];
            
        requestedFields.forEach(field => {
          const base = getBaseField(field);
          if (!allowedFields.includes(base)) {
            const warning = {
              resource: resourceType,
              field: base,
              message: `Field is not supported for ${resourceType}.`
            };
            warnings.push(warning);
            console.warn(`[Field Validation Warning] Resource: ${resourceType}, Field: "${base}" is not officially supported.`);
          }
        });
      }
    }

    // Build URL query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('access_token', accessToken);

    // Append other query params
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (key === 'fields' && Array.isArray(val)) {
          queryParams.append(key, val.join(','));
        } else if (typeof val === 'object') {
          queryParams.append(key, JSON.stringify(val));
        } else {
          queryParams.append(key, String(val));
        }
      }
    });

    const url = `${this.BASE_URL}/${endpoint}?${queryParams.toString()}`;

    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    // Run request via the ConcurrencyQueue
    return metaQueue.run(async ({ queueWaitTime, queueSize }) => {
      const backoffs = [0, 1000, 2000, 4000];
      let retryCount = 0;
      let lastError;
      const requestStart = Date.now();

      while (retryCount < backoffs.length) {
        try {
          const response = await fetch(url, requestOptions);
          const data = await response.json();
          const responseTime = Date.now() - requestStart;

          if (!response.ok) {
            const error = new Error(data.error?.message || 'Graph API request failed');
            error.response = { data };
            error.errorType = 'META_API_ERROR';
            throw error;
          }

          // Append warnings if any
          if (warnings.length > 0) {
            data._warnings = warnings;
          }

          // Measure size of payload
          const payloadSize = JSON.stringify(data).length;

          // Log performance
          Logger.logMetaRequest({
            endpoint,
            responseTime,
            queueWaitTime,
            queueSize,
            cacheHit: false,
            retryCount,
            payloadSize
          });

          return data;
        } catch (err) {
          lastError = err;

          const isRateLimit = err.response?.data?.error?.code === 429 || 
                              err.response?.data?.error?.code === 80004 ||
                              (err.response?.data?.error?.message && /rate limit/i.test(err.response.data.error.message));
                              
          const isNetworkFailure = !err.response && (err.originalError || err.message.includes('fetch') || err.message.includes('connection'));
          
          const isAuthError = err.response?.data?.error?.code === 190;

          if ((isRateLimit || isNetworkFailure) && !isAuthError) {
            const delay = backoffs[retryCount];
            if (delay > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            retryCount++;
            continue;
          }

          throw err;
        }
      }
      throw lastError;
    });
  }

  /**
   * GET convenience method
   */
  static async get(endpoint, user, params = {}, options = {}) {
    return this.request(endpoint, user, { method: 'GET', params, ...options });
  }
}

export default MetaService;
