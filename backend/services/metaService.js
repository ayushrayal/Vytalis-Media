import encryption from '../utils/encryption.js';
import metaApi from '../config/metaApi.js';
import { getBaseField, fieldMap } from '../config/metaFields.js';
import Logger from '../utils/logger.js';
import DiagnosticsService from './diagnosticsService.js';
import { PerfTracker } from '../utils/perfTracker.js';
import CacheService from './cacheService.js';


// Cooldown state per Ad Account ID
const cooldowns = new Map();
// Memory cache of last successful responses
const lastResponses = new Map();

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

  static getQueueStatus() {
    return {
      running: metaQueue.running,
      waiting: metaQueue.queue.length
    };
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
    const accountId = user.metaAccountId;
    const requestHashKey = `${accountId}::${endpoint}::${JSON.stringify(params)}::${method}`;
    const requestId = user.requestId || 'N/A';

    // --- RATE LIMIT COOLDOWN PER AD ACCOUNT ---
    const cooldownUntil = cooldowns.get(accountId);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const cachedData = lastResponses.get(requestHashKey);
      if (cachedData) {
        Logger.warn(`[Rate Limit Cooldown] Serving stale cached response for ${endpoint} on account ${accountId} to avoid retry storm.`, requestId);
        
        // Collect telemetry
        DiagnosticsService.collect({
          userId: user._id ? user._id.toString() : user.id,
          metaAccountId: accountId,
          businessId: params.business_id || null,
          graphApiVersion: metaApi.version,
          dateRange: params.time_range || params.date_preset || null,
          cacheStatus: 'hit',
          queueStatus: MetaService.getQueueStatus(),
          retryCount: 0,
          requestDurationMs: 0,
          payloadSize: JSON.stringify(cachedData).length,
          apiEndpoint: endpoint,
          accessToken
        });

        // Structured dev log
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Meta API Development Log]
  Request ID:        ${requestId}
  Resource Type:     ${resourceType || 'N/A'}
  Endpoint:          ${endpoint}
  HTTP Status:       200 OK (Stale Fallback)
  Meta Error Code:   None
  Meta Error Subcode:None
  Raw Error Message: None
  Retry Count:       0
  Cache Hit/Miss:    HIT (Rate Limit Cooldown Cache)
  Queue Status:      Running: ${metaQueue.running}, Waiting: ${metaQueue.queue.length}
  Execution Time:    0ms
  Payload Size:      ${JSON.stringify(cachedData).length} bytes
----------------------------------------`);
        }

        return cachedData;
      }
      Logger.warn(`[Rate Limit Cooldown] Account ${accountId} is in cooldown, but no cached response was found for ${endpoint}.`, requestId);
    }

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
            Logger.warn(`[Field Validation Warning] Resource: ${resourceType}, Field: "${base}" is not officially supported.`, requestId);
          }
        });
      }
    }

    // Build URL query parameters helper function
    const buildUrlParams = (currentParams) => {
      const queryParams = new URLSearchParams();
      queryParams.append('access_token', accessToken);

      Object.entries(currentParams).forEach(([key, val]) => {
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
      return queryParams.toString();
    };

    let url = `${this.BASE_URL}/${endpoint}?${buildUrlParams(params)}`;

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
          if (process.env.NODE_ENV !== 'production') {
            CacheService.safeTime("Meta API");
          }
          const response = await fetch(url, requestOptions);
          const data = await response.json();
          const responseTime = Date.now() - requestStart;

          if (process.env.NODE_ENV !== 'production') {
            CacheService.safeTimeEnd("Meta API");
            console.log(`[Meta API Call] Endpoint: ${endpoint || '/'} - Duration: ${responseTime}ms - Version: ${metaApi.version} - Status: ${response.status}`);
            PerfTracker.increment('metaRequests');
            PerfTracker.track('metaApi', responseTime);
          }


          if (!response.ok) {
            const error = new Error(data.error?.message || 'Graph API request failed');
            error.response = { data };
            error.errorType = 'META_API_ERROR';
            error.metaRequestId = requestId;
            error.metaGraphVersion = metaApi.version;
            error.metaErrorCode = data.error?.code;
            error.metaSubcode = data.error?.error_subcode;
            error.metaEndpoint = endpoint;
            error.metaRetryCount = retryCount;
            error.metaCacheStatus = 'MISS';
            error.metaAdAccountId = accountId;
            error.fields = params.fields;
            throw error;
          }

          // Append warnings if any
          if (warnings.length > 0) {
            data._warnings = warnings;
          }

          // Cache the successful response for emergency cooldown fallbacks
          lastResponses.set(requestHashKey, data);

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
            payloadSize,
            requestId
          });

          // Collect telemetry
          DiagnosticsService.collect({
            userId: user._id ? user._id.toString() : user.id,
            metaAccountId: accountId,
            businessId: params.business_id || null,
            graphApiVersion: metaApi.version,
            dateRange: params.time_range || params.date_preset || null,
            cacheStatus: 'miss',
            queueStatus: MetaService.getQueueStatus(),
            retryCount,
            requestDurationMs: responseTime,
            payloadSize,
            apiEndpoint: endpoint,
            accessToken
          });

          // Structured dev log
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[Meta API Development Log]
  Request ID:        ${requestId}
  Resource Type:     ${resourceType || 'N/A'}
  Endpoint:          ${endpoint}
  HTTP Status:       200 OK
  Meta Error Code:   None
  Meta Error Subcode:None
  Raw Error Message: None
  Retry Count:       ${retryCount}
  Cache Hit/Miss:    MISS
  Queue Status:      Running: ${metaQueue.running}, Waiting: ${metaQueue.queue.length}
  Execution Time:    ${responseTime}ms
  Payload Size:      ${payloadSize} bytes
----------------------------------------`);
          }

          return data;
        } catch (err) {
          lastError = err;
          
          // Ensure diagnostic keys are attached to errors thrown in catch
          err.metaRequestId = requestId;
          err.metaGraphVersion = metaApi.version;
          err.metaErrorCode = err.response?.data?.error?.code || err.metaErrorCode;
          err.metaSubcode = err.response?.data?.error?.error_subcode || err.metaSubcode;
          err.metaEndpoint = endpoint;
          err.metaRetryCount = retryCount;
          err.metaCacheStatus = 'MISS';
          err.metaAdAccountId = accountId;
          err.fields = params.fields;

          DiagnosticsService.recordError(err);

          // Structured dev log on failure
          if (process.env.NODE_ENV !== 'production') {
            const errData = err.response?.data?.error;
            console.error(`[Meta API Development Log - FAILURE]
  Request ID:        ${requestId}
  Resource Type:     ${resourceType || 'N/A'}
  Endpoint:          ${endpoint}
  HTTP Status:       ${err.response?.status || 500}
  Meta Error Code:   ${errData?.code || 'N/A'}
  Meta Error Subcode:${errData?.error_subcode || 'N/A'}
  Raw Error Message: ${errData?.message || err.message}
  Retry Count:       ${retryCount}
  Cache Hit/Miss:    MISS
  Queue Status:      Running: ${metaQueue.running}, Waiting: ${metaQueue.queue.length}
  Execution Time:    ${Date.now() - requestStart}ms
  Payload Size:      0 bytes
----------------------------------------`);
          }

          const isRateLimit = err.response?.data?.error?.code === 429 || 
                              err.response?.data?.error?.code === 80004 ||
                              (err.response?.data?.error?.message && /rate limit/i.test(err.response.data.error.message));

          if (isRateLimit) {
            // Establish Ad Account cooldown for 30 seconds
            cooldowns.set(accountId, Date.now() + 30000);
            Logger.warn(`[Rate Limit Cooldown] Ad Account ${accountId} rate limited. Cool down initiated for 30s.`, requestId);
          }

          // --- SELF-HEALING FIELD VALIDATION ON ERROR #100 ---
          if (err.response?.data?.error?.code === 100) {
            const errMsg = err.response.data.error.message || '';
            Logger.warn(`[Self-Healing] Error #100 caught on ${endpoint}: ${errMsg}`, requestId);

            let offendingField = null;
            const fieldPatterns = [
              /field ['"]?([a-zA-Z0-9_]+)['"]?/i,
              /parameter ['"]?([a-zA-Z0-9_]+)['"]?/i,
              /look up field ['"]?([a-zA-Z0-9_]+)['"]?/i,
              /cannot query field ['"]?([a-zA-Z0-9_]+)['"]?/i
            ];
            for (const pattern of fieldPatterns) {
              const match = errMsg.match(pattern);
              if (match && match[1]) {
                offendingField = match[1];
                break;
              }
            }

            if (params.fields) {
              let fieldsArr = Array.isArray(params.fields)
                ? params.fields
                : typeof params.fields === 'string'
                  ? params.fields.split(',')
                  : [];

              if (offendingField) {
                const initialLen = fieldsArr.length;
                fieldsArr = fieldsArr.filter(f => f !== offendingField && !f.startsWith(`${offendingField}{`));
                if (fieldsArr.length < initialLen) {
                  Logger.warn(`[Self-Healing] Removing offending field "${offendingField}" and retrying request...`, requestId);
                  if (Array.isArray(params.fields)) {
                    params.fields = fieldsArr;
                  } else {
                    params.fields = fieldsArr.join(',');
                  }
                  
                  // Rebuild url with fresh params
                  url = `${this.BASE_URL}/${endpoint}?${buildUrlParams(params)}`;
                  retryCount++;
                  continue;
                }
              }

              // Fallback whitelist intersection
              if (resourceType) {
                const allowed = fieldMap[resourceType];
                if (allowed) {
                  const initialLen = fieldsArr.length;
                  fieldsArr = fieldsArr.filter(field => allowed.includes(getBaseField(field)));
                  if (fieldsArr.length < initialLen) {
                    Logger.warn(`[Self-Healing] Restricting requested fields to whitelist for ${resourceType} and retrying...`, requestId);
                    if (Array.isArray(params.fields)) {
                      params.fields = fieldsArr;
                    } else {
                      params.fields = fieldsArr.join(',');
                    }
                    
                    url = `${this.BASE_URL}/${endpoint}?${buildUrlParams(params)}`;
                    retryCount++;
                    continue;
                  }
                }
              }
            }
          }
                              
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

  /**
   * Fetch Meta Ad Account Details including name and business info
   * GET /act_<META_ACCOUNT_ID>?fields=name,business{name}
   */
  static async getAccountName(user) {
    if (!user || !user.metaAccountId || !user.metaAccessToken) {
      return null;
    }
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    try {
      return await this.get(formattedAccountId, user, { fields: 'name,business{name}' });
    } catch (err) {
      return null;
    }
  }
}

export default MetaService;
