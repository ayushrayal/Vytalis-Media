import ShopifyService from '../services/shopifyService.js';
import CacheService from '../services/cacheService.js';
import Logger from '../utils/logger.js';

class ShopifyController {
  /**
   * Helper to format and log structured errors for Shopify endpoints.
   */
  static handleError(res, error, endpoint) {
    const status = error.status && error.status !== 401 ? error.status : 400;
    const errorType = error.errorType || (status === 429 ? 'RATE_LIMIT' : status >= 500 ? 'SHOPIFY_ERROR' : 'BAD_REQUEST');
    const message = error.message || 'An error occurred during Shopify operation.';

    if (process.env.NODE_ENV !== 'production') {
      Logger.error(`[Shopify API Error] Endpoint: ${endpoint} | Status: ${status} | Error Type: ${errorType} | Message: ${message}`);
    }

    return res.status(status).json({
      success: false,
      errorType,
      message
    });
  }

  /**
   * POST /api/shopify/connect
   */
  static async connect(req, res, next) {
    try {
      const { storeDomain, accessToken, scopes } = req.body;

      if (!storeDomain || !accessToken) {
        return res.status(400).json({
          success: false,
          errorType: 'VALIDATION_ERROR',
          message: 'Both storeDomain and accessToken are required.'
        });
      }

      const result = await ShopifyService.connectOrReconnect(
        req.user._id,
        storeDomain,
        accessToken,
        scopes
      );

      // Clear cached analytics on reconnect
      CacheService.delByPattern(`shopify_*:${req.user._id}:*`);

      res.status(200).json({
        success: true,
        message: 'Shopify store connected successfully.',
        data: result
      });
    } catch (error) {
      ShopifyController.handleError(res, error, 'POST /api/shopify/connect');
    }
  }

  /**
   * GET /api/shopify/status
   */
  static async getStatus(req, res, next) {
    try {
      const result = await ShopifyService.getStatus(req.user._id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/status');
    }
  }

  /**
   * POST /api/shopify/disconnect
   */
  static async disconnect(req, res, next) {
    try {
      const result = await ShopifyService.disconnect(req.user._id);
      CacheService.delByPattern(`shopify_*:${req.user._id}:*`);

      res.status(200).json({
        success: true,
        message: 'Shopify store disconnected successfully.',
        data: result
      });
    } catch (error) {
      ShopifyController.handleError(res, error, 'POST /api/shopify/disconnect');
    }
  }

  /**
   * GET /api/shopify/health
   */
  static async checkHealth(req, res, next) {
    try {
      const result = await ShopifyService.checkHealth(req.user._id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/health');
    }
  }

  /**
   * GET /api/shopify/dashboard?preset=30d&refresh=true
   */
  static async getDashboardOverview(req, res, next) {
    try {
      const preset = req.query.preset || '30d';
      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_dashboard:${req.user._id}:${preset}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const data = await ShopifyService.getDashboardOverview(req.user._id, preset);
      const payload = {
        success: true,
        data,
        meta: {
          preset,
          cached: false,
          lastUpdated: new Date().toISOString()
        }
      };

      // Cache for 5 minutes (300 seconds)
      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 300);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/dashboard');
    }
  }

  /**
   * GET /api/shopify/sales-trend?preset=30d&refresh=true
   */
  static async getSalesTrend(req, res, next) {
    try {
      const preset = req.query.preset || '30d';
      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_trend:${req.user._id}:${preset}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const data = await ShopifyService.getSalesTrend(req.user._id, preset);
      const payload = {
        success: true,
        data,
        meta: {
          preset,
          cached: false,
          lastUpdated: new Date().toISOString()
        }
      };

      // Cache for 5 minutes (300 seconds)
      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 300);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/sales-trend');
    }
  }

  /**
   * GET /api/shopify/top-products?preset=30d&limit=10&refresh=true
   */
  static async getTopProducts(req, res, next) {
    try {
      const preset = req.query.preset || '30d';
      const limit = parseInt(req.query.limit || '10', 10);
      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_top_products:${req.user._id}:${preset}:${limit}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const data = await ShopifyService.getTopProducts(req.user._id, preset, limit);
      const payload = {
        success: true,
        data,
        meta: {
          preset,
          cached: false,
          lastUpdated: new Date().toISOString()
        }
      };

      // Cache for 10 minutes (600 seconds)
      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 600);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/top-products');
    }
  }

  /**
   * GET /api/shopify/recent-orders?limit=10&refresh=true
   */
  static async getRecentOrders(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '10', 10);
      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_recent_orders:${req.user._id}:${limit}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const data = await ShopifyService.getRecentOrders(req.user._id, limit);
      const payload = {
        success: true,
        data,
        meta: {
          limit,
          cached: false,
          lastUpdated: new Date().toISOString()
        }
      };

      // Cache for 5 minutes (300 seconds)
      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 300);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/recent-orders');
    }
  }
}

export default ShopifyController;
