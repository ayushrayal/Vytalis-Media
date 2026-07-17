import UserRepository from '../repositories/userRepository.js';
import ShopifyClient from '../utils/shopifyClient.js';
import encryption from '../utils/encryption.js';
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
   * Helper to convert date presets (7d, 30d, 90d) to ISO date filter strings.
   */
  static getPresetDateFilter(preset = '30d') {
    const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return {
      isoString: date.toISOString(),
      days
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
   * Connect or Reconnect a Shopify store for a given user.
   */
  static async connectOrReconnect(userId, storeDomain, accessToken, scopes = []) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.errorType = 'NOT_FOUND';
      throw err;
    }

    const shopDetails = await this.verifyConnection(storeDomain, accessToken);
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
      scopes: Array.isArray(scopes) ? scopes : [],
      connectedAt: user.shopify?.connectedAt || now,
      lastVerifiedAt: now
    };

    await UserRepository.save(user);

    return this.sanitizeShopifyResponse(user.shopify);
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
  static async getDashboardOverview(userId, preset = '30d') {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);
    const { isoString } = this.getPresetDateFilter(preset);
    const queryFilter = `created_at:>=${isoString}`;

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
  static async getSalesTrend(userId, preset = '30d') {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);
    const { isoString, days } = this.getPresetDateFilter(preset);
    const queryFilter = `created_at:>=${isoString}`;

    const data = await ShopifyClient.graphqlRequest(storeDomain, accessToken, GET_SALES_TREND_QUERY, { queryFilter });
    const orderEdges = data?.orders?.edges || [];

    // Initialize daily map for all dates in preset range
    const dailyMap = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
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
   * Fetch Top Selling Products.
   */
  static async getTopProducts(userId, preset = '30d', limit = 10) {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);
    const { isoString } = this.getPresetDateFilter(preset);
    const queryFilter = `created_at:>=${isoString}`;

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

    const products = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(p => ({
        ...p,
        revenue: parseFloat(p.revenue.toFixed(2))
      }));

    return {
      products,
      currency
    };
  }

  /**
   * Fetch 10 Recent Orders.
   */
  static async getRecentOrders(userId, limit = 10) {
    const { storeDomain, accessToken, currency } = await this.getDecryptedUserShopify(userId);

    const data = await ShopifyClient.graphqlRequest(storeDomain, accessToken, GET_RECENT_ORDERS_QUERY, { first: limit });
    const orderEdges = data?.orders?.edges || [];

    const orders = orderEdges.map(({ node }) => ({
      id: node.id,
      orderNumber: node.name || 'N/A',
      createdAt: node.createdAt,
      customerName: node.customer ? (node.customer.displayName || `${node.customer.firstName || ''} ${node.customer.lastName || ''}`.trim()) : 'Guest',
      totalPrice: parseFloat(node?.currentTotalPriceSet?.shopMoney?.amount || '0').toFixed(2),
      financialStatus: node.displayFinancialStatus || 'PENDING',
      fulfillmentStatus: node.displayFulfillmentStatus || 'UNFULFILLED'
    }));

    return {
      orders,
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
