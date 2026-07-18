import axios from 'axios';
import UserRepository from '../repositories/userRepository.js';
import ShopifyClient from '../utils/shopifyClient.js';
import ShopifyOAuth from '../utils/shopifyOAuth.js';
import encryption from '../utils/encryption.js';
import { SHOPIFY_SCOPES } from '../constants/shopify.js';
import { GET_DASHBOARD_ANALYTICS_QUERY } from '../graphql/shopify/dashboardQueries.js';
import { GET_SALES_TREND_QUERY } from '../graphql/shopify/salesQueries.js';
import { GET_TOP_PRODUCTS_QUERY } from '../graphql/shopify/productQueries.js';
import { GET_RECENT_ORDERS_QUERY } from '../graphql/shopify/orderQueries.js';

const GET_SHOP_QUERY = `
  query getShopDetails {
    shop {
      id
      name
      myshopifyDomain
      currencyCode
      ianaTimezone
    }
  }
`;

class ShopifyService {
  /**
   * Helper to fetch user document and decrypt access token.
   */
  static async getDecryptedUserShopify(userId) {
    const user = await UserRepository.findById(userId);
    if (!user || !user.shopify || !user.shopify.connected || !user.shopify.accessToken) {
      const err = new Error('Shopify store is not connected.');
      err.status = 400;
      err.errorType = 'BAD_REQUEST';
      throw err;
    }

    const decryptedToken = encryption.decrypt(user.shopify.accessToken);
    return {
      user,
      storeDomain: user.shopify.storeDomain,
      accessToken: decryptedToken,
      currency: user.shopify.currency || 'USD',
      shopId: user.shopify.shopId || 'default'
    };
  }

  /**
   * Helper to convert date presets (today, yesterday, 7d, 30d, custom) to Shopify GraphQL query filters.
   */
  static getPresetDateFilter(preset = '30d', startDate = null, endDate = null) {
    const now = new Date();

    if (preset === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return {
        queryFilter: `created_at:>=${todayStart.toISOString()}`,
        days: 1,
        startDate: todayStart.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
      };
    }

    if (preset === 'yesterday') {
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return {
        queryFilter: `created_at:>=${yesterdayStart.toISOString()} created_at:<=${yesterdayEnd.toISOString()}`,
        days: 1,
        startDate: yesterdayStart.toISOString().split('T')[0],
        endDate: yesterdayEnd.toISOString().split('T')[0]
      };
    }

    if (preset === 'custom' && startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      const diffMs = Math.max(end.getTime() - start.getTime(), 0);
      const days = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1);

      return {
        queryFilter: `created_at:>=${start.toISOString()} created_at:<=${end.toISOString()}`,
        days,
        startDate,
        endDate
      };
    }

    const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return {
      queryFilter: `created_at:>=${date.toISOString()}`,
      days,
      startDate: date.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  }

  /**
   * Generate Shopify OAuth Authorization URL.
   */
  static generateAuthUrl(storeDomain, userId) {
    if (!storeDomain) {
      const err = new Error('Shopify store domain is required.');
      err.status = 400;
      err.errorType = 'INVALID_DOMAIN';
      throw err;
    }

    const normalizedShop = ShopifyClient.normalizeDomain(storeDomain);
    const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
    const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_REDIRECT_URI) {
      const err = new Error('Shopify OAuth credentials (SHOPIFY_CLIENT_ID, SHOPIFY_REDIRECT_URI) are not configured.');
      err.status = 500;
      err.errorType = 'INTERNAL_SERVER_ERROR';
      throw err;
    }

    const state = ShopifyOAuth.generateOAuthState(userId);

    const authUrl =
      `https://${normalizedShop}/admin/oauth/authorize` +
      `?client_id=${SHOPIFY_CLIENT_ID}` +
      `&scope=${SHOPIFY_SCOPES}` +
      `&redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}` +
      `&state=${state}` +
      `&response_type=code`;

    console.log({
      normalizedShop,
      redirectUri: SHOPIFY_REDIRECT_URI,
      callbackRoute: '/api/shopify/callback',
      authUrl
    });

    return {
      authUrl,
      storeDomain: normalizedShop
    };
  }

  /**
   * Exchange OAuth temporary authorization code for permanent Admin API access token.
   */
  static async exchangeCodeForToken(shop, code) {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const err = new Error('Shopify OAuth client credentials are missing.');
      err.status = 500;
      err.errorType = 'INTERNAL_SERVER_ERROR';
      throw err;
    }

    const url = `https://${shop}/admin/oauth/access_token`;

    try {
      const response = await axios.post(
        url,
        {
          client_id: clientId,
          client_secret: clientSecret,
          code
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );

      if (!response.data?.access_token) {
        const err = new Error('Failed to retrieve access_token from Shopify OAuth.');
        err.status = 400;
        err.errorType = 'INVALID_TOKEN';
        throw err;
      }

      return {
        accessToken: response.data.access_token,
        scope: response.data.scope ? response.data.scope.split(',') : []
      };
    } catch (error) {
      if (error.response) {
        const msg = error.response.data?.error_description || error.response.data?.error || 'OAuth token exchange failed.';
        const err = new Error(msg);
        err.status = 400;
        err.errorType = 'INVALID_TOKEN';
        throw err;
      }
      throw error;
    }
  }

  /**
   * Handle Shopify OAuth Redirect Callback.
   */
  static async handleOAuthCallback(queryParams) {
    if (queryParams.error || queryParams.error_description) {
      const err = new Error(queryParams.error_description || 'Shopify authorization was cancelled.');
      err.status = 400;
      err.errorType = 'CANCELLED';
      throw err;
    }

    const { shop, code, state } = queryParams;

    if (!shop || !code || !state) {
      const err = new Error('Missing required OAuth callback parameters (shop, code, or state).');
      err.status = 400;
      err.errorType = 'BAD_REQUEST';
      throw err;
    }

    // 1. Verify HMAC Signature
    const isHmacValid = ShopifyOAuth.verifyHMAC(queryParams);
    if (!isHmacValid) {
      const err = new Error('Invalid HMAC signature received from Shopify. OAuth security check failed.');
      err.status = 400;
      err.errorType = 'INVALID_HMAC';
      throw err;
    }

    // 2. Verify State (CSRF & User context)
    let decodedState;
    try {
      decodedState = ShopifyOAuth.verifyOAuthState(state);
    } catch (stateErr) {
      const err = new Error(stateErr.message || 'OAuth state token validation failed.');
      err.status = 400;
      err.errorType = 'INVALID_STATE';
      throw err;
    }
    const userId = decodedState.userId;

    let normalizedDomain;
    try {
      normalizedDomain = ShopifyClient.normalizeDomain(shop);
    } catch (domErr) {
      const err = new Error('Invalid Shopify store domain provided in OAuth callback.');
      err.status = 400;
      err.errorType = 'INVALID_DOMAIN';
      throw err;
    }

    // 3. Exchange Code for Access Token
    const { accessToken, scope } = await this.exchangeCodeForToken(normalizedDomain, code);

    // 4. Verify Store Connection via GraphQL
    const shopDetails = await this.verifyConnection(normalizedDomain, accessToken);

    // 5. Update MongoDB User Document
    const user = await UserRepository.findById(userId);
    if (!user) {
      const err = new Error('User account not found.');
      err.status = 404;
      err.errorType = 'NOT_FOUND';
      throw err;
    }

    const encryptedToken = encryption.encrypt(accessToken.trim());
    const now = new Date();

    user.shopify = {
      connected: true,
      shopId: shopDetails.shopId,
      storeDomain: shopDetails.storeDomain,
      accessToken: encryptedToken,
      shopName: shopDetails.shopName,
      currency: shopDetails.currency,
      timezone: shopDetails.timezone,
      scopes: scope && scope.length > 0 ? scope : ['read_orders', 'read_products', 'read_customers'],
      connectedAt: user.shopify?.connectedAt || now,
      lastVerifiedAt: now
    };

    await UserRepository.save(user);

    return {
      user,
      shopify: this.sanitizeShopifyResponse(user.shopify)
    };
  }

  /**
   * Verify Shopify Admin API connection using GraphQL query.
   */
  static async verifyConnection(storeDomain, accessToken) {
    if (!storeDomain || !accessToken) {
      const err = new Error('Both store domain and access token are required.');
      err.status = 400;
      err.errorType = 'VALIDATION_ERROR';
      throw err;
    }

    const normalizedDomain = ShopifyClient.normalizeDomain(storeDomain);
    const data = await ShopifyClient.graphqlRequest(normalizedDomain, accessToken, GET_SHOP_QUERY);

    if (!data?.shop) {
      throw new Error('Failed to retrieve shop information from Shopify API.');
    }

    const { id, name, myshopifyDomain, currencyCode, ianaTimezone } = data.shop;

    return {
      shopId: id || null,
      shopName: name || null,
      storeDomain: myshopifyDomain || normalizedDomain,
      currency: currencyCode || null,
      timezone: ianaTimezone || null
    };
  }

  /**
   * Get safe Shopify connection status for a user.
   */
  static async getStatus(userId) {
    const user = await UserRepository.findById(userId);
    if (!user || !user.shopify || !user.shopify.connected) {
      return { connected: false };
    }

    return this.sanitizeShopifyResponse(user.shopify);
  }

  /**
   * Disconnect Shopify store for a user.
   */
  static async disconnect(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.errorType = 'NOT_FOUND';
      throw err;
    }

    user.shopify = {
      connected: false,
      shopId: null,
      storeDomain: null,
      accessToken: null,
      shopName: null,
      currency: null,
      timezone: null,
      scopes: [],
      connectedAt: null,
      lastVerifiedAt: null
    };

    await UserRepository.save(user);

    return { connected: false };
  }

  /**
   * Verify Shopify connection health.
   */
  static async checkHealth(userId) {
    const user = await UserRepository.findById(userId);
    if (!user || !user.shopify || !user.shopify.connected || !user.shopify.accessToken) {
      return {
        connected: false,
        healthy: false,
        message: 'Shopify is not connected.'
      };
    }

    try {
      const decryptedToken = encryption.decrypt(user.shopify.accessToken);
      const shopDetails = await this.verifyConnection(user.shopify.storeDomain, decryptedToken);
      
      const now = new Date();
      user.shopify.lastVerifiedAt = now;
      if (shopDetails.shopName) user.shopify.shopName = shopDetails.shopName;
      if (shopDetails.currency) user.shopify.currency = shopDetails.currency;
      if (shopDetails.timezone) user.shopify.timezone = shopDetails.timezone;

      await UserRepository.save(user);

      return {
        connected: true,
        healthy: true,
        lastVerifiedAt: now,
        message: 'Connection healthy'
      };
    } catch (error) {
      return {
        connected: true,
        healthy: false,
        lastVerifiedAt: user.shopify.lastVerifiedAt,
        message: error.message || 'Connection check failed.'
      };
    }
  }

  /**
   * Fetch Overview KPI Metrics for Dashboard.
   */
  static async getDashboardOverview(userId, preset = '30d', startDate = null, endDate = null) {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);
    const { queryFilter } = this.getPresetDateFilter(preset, startDate, endDate);

    const data = await ShopifyClient.graphqlRequest(storeDomain, accessToken, GET_DASHBOARD_ANALYTICS_QUERY, { queryFilter });
    const orderEdges = data?.orders?.edges || [];

    let totalRevenue = 0;
    let totalOrders = orderEdges.length;
    let productsSold = 0;
    const customerIds = new Set();
    let returningCustomers = 0;

    orderEdges.forEach(({ node }) => {
      const amount = parseFloat(node?.currentTotalPriceSet?.shopMoney?.amount || '0');
      totalRevenue += amount;

      if (node?.customer) {
        customerIds.add(node.customer.id);
        if (node.customer.numberOfOrders > 1) {
          returningCustomers++;
        }
      }

      if (node?.lineItems?.edges) {
        node.lineItems.edges.forEach(({ node: item }) => {
          productsSold += item.quantity || 0;
        });
      }
    });

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      totalCustomers: customerIds.size,
      returningCustomers,
      productsSold,
      currency
    };
  }

  /**
   * Fetch Sales Trend timeline aggregated by date.
   */
  static async getSalesTrend(userId, preset = '30d', startDate = null, endDate = null) {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);
    const { queryFilter, days, startDate: resolvedStart, endDate: resolvedEnd } = this.getPresetDateFilter(preset, startDate, endDate);

    const data = await ShopifyClient.graphqlRequest(storeDomain, accessToken, GET_SALES_TREND_QUERY, { queryFilter });
    const orderEdges = data?.orders?.edges || [];

    const dailyMap = {};
    const endAnchor = resolvedEnd ? new Date(`${resolvedEnd}T00:00:00.000Z`) : new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endAnchor);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      dailyMap[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
    }

    orderEdges.forEach(({ node }) => {
      if (node?.createdAt) {
        const dateKey = node.createdAt.split('T')[0];
        const amount = parseFloat(node?.currentTotalPriceSet?.shopMoney?.amount || '0');
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].revenue += amount;
          dailyMap[dateKey].orders += 1;
        }
      }
    });

    const trend = Object.values(dailyMap).map(item => ({
      ...item,
      revenue: parseFloat(item.revenue.toFixed(2))
    }));

    return {
      trend,
      currency
    };
  }

  /**
   * Fetch Top Selling Products (Server-Side Paginated).
   * TODO V2: Migrate to Shopify GraphQL cursor-based pagination (first/after) for large catalog scalability.
   */
  static async getTopProducts(userId, preset = '30d', page = 1, limit = 10, startDate = null, endDate = null) {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);
    const { queryFilter } = this.getPresetDateFilter(preset, startDate, endDate);

    const data = await ShopifyClient.graphqlRequest(storeDomain, accessToken, GET_TOP_PRODUCTS_QUERY, { queryFilter });
    const orderEdges = data?.orders?.edges || [];

    const productMap = {};

    orderEdges.forEach(({ node }) => {
      const lineItems = node?.lineItems?.edges || [];
      lineItems.forEach(({ node: item }) => {
        const title = item.title || item.variant?.product?.title || 'Unknown Product';
        const imageUrl = item.variant?.image?.url || item.variant?.product?.featuredImage?.url || null;
        const qty = item.quantity || 0;
        const amount = parseFloat(item.originalTotalSet?.shopMoney?.amount || '0');

        if (!productMap[title]) {
          productMap[title] = {
            name: title,
            imageUrl,
            unitsSold: 0,
            revenue: 0
          };
        }

        productMap[title].unitsSold += qty;
        productMap[title].revenue += amount;
        if (!productMap[title].imageUrl && imageUrl) {
          productMap[title].imageUrl = imageUrl;
        }
      });
    });

    const allProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map(p => ({
        ...p,
        revenue: parseFloat(p.revenue.toFixed(2))
      }));

    const total = allProducts.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const paginatedProducts = allProducts.slice((safePage - 1) * limit, safePage * limit);

    return {
      products: paginatedProducts,
      page: safePage,
      limit,
      total,
      totalPages,
      currency
    };
  }

  /**
   * Fetch Recent Orders (Server-Side Paginated).
   * TODO V2: Migrate to Shopify GraphQL cursor-based pagination (first/after) for high-volume order scalability.
   */
  static async getRecentOrders(userId, page = 1, limit = 10, preset = '30d', startDate = null, endDate = null) {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);
    const { queryFilter } = this.getPresetDateFilter(preset, startDate, endDate);

    const data = await ShopifyClient.graphqlRequest(storeDomain, accessToken, GET_DASHBOARD_ANALYTICS_QUERY, { queryFilter });
    const orderEdges = data?.orders?.edges || [];

    const allOrders = orderEdges.map(({ node }) => ({
      id: node.id,
      orderNumber: node.name || 'N/A',
      createdAt: node.createdAt,
      customerName: node.customer ? (node.customer.displayName || `${node.customer.firstName || ''} ${node.customer.lastName || ''}`.trim()) : 'Guest',
      totalPrice: parseFloat(node?.currentTotalPriceSet?.shopMoney?.amount || '0').toFixed(2),
      financialStatus: node.displayFinancialStatus || 'PENDING',
      fulfillmentStatus: node.displayFulfillmentStatus || 'UNFULFILLED'
    }));

    const total = allOrders.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const paginatedOrders = allOrders.slice((safePage - 1) * limit, safePage * limit);

    return {
      orders: paginatedOrders,
      page: safePage,
      limit,
      total,
      totalPages,
      currency
    };
  }

  /**
   * Helper to strip encrypted accessToken before sending payload to frontend.
   */
  static sanitizeShopifyResponse(shopifyDoc) {
    if (!shopifyDoc || !shopifyDoc.connected) {
      return { connected: false };
    }

    return {
      connected: true,
      shopId: shopifyDoc.shopId || null,
      storeDomain: shopifyDoc.storeDomain || null,
      shopName: shopifyDoc.shopName || null,
      currency: shopifyDoc.currency || null,
      timezone: shopifyDoc.timezone || null,
      scopes: shopifyDoc.scopes || [],
      connectedAt: shopifyDoc.connectedAt || null,
      lastVerifiedAt: shopifyDoc.lastVerifiedAt || null
    };
  }
}

export default ShopifyService;
