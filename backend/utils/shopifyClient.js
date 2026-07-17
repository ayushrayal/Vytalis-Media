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
      throw new Error('Store domain is required and must be a string.');
    }

    let cleaned = domain.trim().toLowerCase();
    
    // Remove protocol prefix if present
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    
    // Remove trailing slashes and paths
    cleaned = cleaned.split('/')[0].trim();

    if (!cleaned) {
      throw new Error('Invalid store domain provided.');
    }

    // Append .myshopify.com if not already present
    if (!cleaned.endsWith('.myshopify.com')) {
      // Remove any trailing dots or accidental extensions
      cleaned = `${cleaned.replace(/\.+$/, '')}.myshopify.com`;
    }

    // Basic domain validation pattern
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    if (!domainRegex.test(cleaned)) {
      throw new Error('Invalid Shopify store domain format. Example: my-store.myshopify.com');
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
      throw new Error('Shopify Admin Access Token is required.');
    }

    const normalizedDomain = this.normalizeDomain(storeDomain);
    const url = `https://${normalizedDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

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
        if (Array.isArray(errors) && errors.length > 0) {
          errorMessage = errors.map((err) => err.message).join('; ');
        } else if (typeof errors === 'string') {
          errorMessage = errors;
        }
        const err = new Error(errorMessage);
        err.status = 400; // Bad Request (never 401)
        err.errorType = 'SHOPIFY_ERROR';
        err.graphqlErrors = errors;
        throw err;
      }

      if (!response.data?.data) {
        const err = new Error('Invalid empty data payload received from Shopify API.');
        err.status = 502;
        err.errorType = 'SHOPIFY_ERROR';
        throw err;
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          const err = new Error('Invalid or expired Shopify Access Token. Access denied.');
          err.status = 400; // Reclassified from 401 to 400 Bad Request
          err.errorType = 'BAD_REQUEST';
          throw err;
        }
        if (status === 404) {
          const err = new Error(`Shopify store domain "${normalizedDomain}" not found.`);
          err.status = 400; // Reclassified from 404 to 400 Bad Request
          err.errorType = 'BAD_REQUEST';
          throw err;
        }
        if (status === 429) {
          const err = new Error('Shopify API rate limit exceeded. Please wait and try again.');
          err.status = 429;
          err.errorType = 'RATE_LIMIT';
          throw err;
        }
        const msg = error.response.data?.errors || error.response.data?.message || `Shopify API error (${status}).`;
        const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        err.status = 502; // Downstream API failure
        err.errorType = 'SHOPIFY_ERROR';
        throw err;
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        const err = new Error('Request to Shopify API timed out or store host unreachable. Please try again.');
        err.status = 502; // Downstream API failure
        err.errorType = 'SHOPIFY_ERROR';
        throw err;
      }

      // Preserve existing status/errorType or default to 400 Bad Request
      if (!error.status) error.status = 400;
      if (!error.errorType) error.errorType = 'BAD_REQUEST';

      throw error;
    }
  }
}

export default ShopifyClient;
