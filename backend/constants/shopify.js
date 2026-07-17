/**
 * Centralized Shopify Integration Constants
 */

export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

export const SHOPIFY_SCOPES = [
  'read_orders',
  'read_products',
  'read_customers',
  'read_analytics',
  'read_inventory'
].join(',');
