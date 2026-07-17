import axios from 'axios';
import { SHOPIFY_API_VERSION } from '../constants/shopify.js';

class ShopifyClient {
  /**
   * Normalize and sanitize a user-provided store domain string.
   * e.g. "https://my-store.myshopify.com/" -> "my-store.myshopify.com"
   * e.g. "my-store" -> "my-store.myshopify.com"
   */
  static normalizeDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      const err = new Error('Store domain is required.');
      err.status = 400;
      err.errorType = 'INVALID_DOMAIN';
      throw err;
    }

    let cleaned = domain.trim().toLowerCase();
    
    // Remove protocol prefix if present
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    
    // Remove trailing slashes and paths
    cleaned = cleaned.split('/')[0].trim();

    if (!cleaned) {
      const err = new Error('Invalid store domain provided.');
      err.status = 400;
      err.errorType = 'INVALID_DOMAIN';
      throw err;
    }

    // Append .myshopify.com if not already present
    if (!cleaned.endsWith('.myshopify.com')) {
      cleaned = `${cleaned.replace(/\.+$/, '')}.myshopify.com`;
    }

    // Basic domain validation pattern
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    if (!domainRegex.test(cleaned)) {
      const err = new Error('Invalid Shopify store domain format. Example: my-store.myshopify.com');
      err.status = 400;
      err.errorType = 'INVALID_DOMAIN';
      throw err;
    }

    return cleaned;
  }

  /**
   * Execute a GraphQL Admin API request against a normalized store domain.
   * @param {string} storeDomain - Raw or normalized store domain
   * @param {string} accessToken - Decrypted Shopify Admin API access token
   * @param {string} query - GraphQL query or mutation string
   * @param {object} variables - Optional GraphQL variables object
   * @returns {Promise<object>} Returns the GraphQL `data` object payload
   */
  static async graphqlRequest(storeDomain, accessToken, query, variables = {}) {
    if (!accessToken || typeof accessToken !== 'string') {
      const err = new Error('Shopify Admin API Access Token is required.');
      err.status = 400;
      err.errorType = 'INVALID_TOKEN';
      throw err;
    }

    const normalizedDomain = this.normalizeDomain(storeDomain);
    const apiVersion = process.env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION || '2025-01';
    const url = `https://${normalizedDomain}/admin/api/${apiVersion}/graphql.json`;

    try {
      const response = await axios.post(
        url,
        { query, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken.trim()
          },
          timeout: 15000 // 15s timeout
        }
      );

      // Handle GraphQL-level errors array in response payload
      if (response.data?.errors) {
        const errors = response.data.errors;
        let errorMessage = 'Shopify GraphQL query error.';
        let errorType = 'SHOPIFY_API_ERROR';

        const rawErrorStr = Array.isArray(errors)
          ? errors.map((e) => `${e.message || ''} ${e.extensions?.code || ''}`).join(' ')
          : String(errors);

        const upperErr = rawErrorStr.toUpperCase();

        if (upperErr.includes('ACCESS_DENIED') || upperErr.includes('FORBIDDEN') || upperErr.includes('SCOPE')) {
          errorType = 'MISSING_SCOPES';
          errorMessage = 'Shopify token lacks required Admin API permissions/scopes.';
        } else if (upperErr.includes('THROTTLED') || upperErr.includes('RATE_LIMIT')) {
          errorType = 'RATE_LIMIT';
          errorMessage = 'Shopify API rate limit exceeded. Please try again.';
        } else if (upperErr.includes('SYNTAX') || upperErr.includes('VALIDATION') || upperErr.includes('FIELD')) {
          errorType = 'GRAPHQL_ERROR';
          errorMessage = Array.isArray(errors) ? errors.map((e) => e.message).join('; ') : 'GraphQL validation error.';
        } else {
          errorMessage = Array.isArray(errors) ? errors.map((e) => e.message).join('; ') : 'Shopify API error.';
        }

        const err = new Error(errorMessage);
        err.status = errorType === 'RATE_LIMIT' ? 429 : 400;
        err.errorType = errorType;
        throw err;
      }

      if (!response.data?.data) {
        const err = new Error('Empty data payload received from Shopify API.');
        err.status = 502;
        err.errorType = 'SHOPIFY_API_ERROR';
        throw err;
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;

        if (status === 401 || status === 403) {
          const err = new Error('The Shopify Admin API Access Token is invalid or expired.');
          err.status = 400;
          err.errorType = 'INVALID_TOKEN';
          throw err;
        }

        if (status === 404) {
          const err = new Error(`Shopify store domain "${normalizedDomain}" not found.`);
          err.status = 400;
          err.errorType = 'INVALID_DOMAIN';
          throw err;
        }

        if (status === 429) {
          const err = new Error('Shopify API rate limit exceeded. Please wait a moment and try again.');
          err.status = 429;
          err.errorType = 'RATE_LIMIT';
          throw err;
        }

        const msg = error.response.data?.errors || error.response.data?.message || `Shopify API error (${status}).`;
        const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        err.status = 502;
        err.errorType = 'SHOPIFY_API_ERROR';
        throw err;
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        const err = new Error('Unable to reach Shopify API. Please verify network connectivity and store domain.');
        err.status = 502;
        err.errorType = 'NETWORK_ERROR';
        throw err;
      }

      // Preserve mapped errors or assign defaults
      if (!error.status) error.status = 400;
      if (!error.errorType) error.errorType = 'INTERNAL_SERVER_ERROR';

      throw error;
    }
  }
}

export default ShopifyClient;
