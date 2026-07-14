import encryption from '../utils/encryption.js';

/**
 * MetaService - Low-level Graph API communication client
 */
class MetaService {
  static BASE_URL = 'https://graph.facebook.com/v20.0';

  /**
   * Helper to execute a Graph API request
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

    const { method = 'GET', params = {}, body = null } = options;

    // Build URL query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('access_token', accessToken);

    // Append other query params
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
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

    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        // Build error object that is formatted by ErrorService
        const error = new Error(data.error?.message || 'Graph API request failed');
        error.response = { data };
        error.errorType = 'META_API_ERROR';
        throw error;
      }

      return data;
    } catch (err) {
      if (err.errorType === 'META_API_ERROR') {
        throw err;
      }
      
      const newErr = new Error(err.message || 'Graph API connection failed');
      newErr.errorType = 'META_API_ERROR';
      newErr.originalError = err;
      throw newErr;
    }
  }

  /**
   * GET convenience method
   */
  static async get(endpoint, user, params = {}) {
    return this.request(endpoint, user, { method: 'GET', params });
  }
}

export default MetaService;
