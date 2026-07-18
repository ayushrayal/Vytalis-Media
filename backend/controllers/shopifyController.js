import ShopifyService from '../services/shopifyService.js';
import CacheService from '../services/cacheService.js';
import Logger from '../utils/logger.js';

class ShopifyController {
  /**
   * Helper to format production-safe errors and return standardized JSON contract.
   */
  static handleError(res, error, endpointName) {
    const status = error.status && error.status !== 401 ? error.status : 400;
    const errorType = error.errorType || (status === 429 ? 'RATE_LIMIT' : status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'SHOPIFY_API_ERROR');
    const message = error.message || 'An error occurred during Shopify operation.';
    const timestamp = new Date().toISOString();

    // Production-safe error logging: NEVER log tokens, passwords, keys, queries, or headers
    if (process.env.NODE_ENV !== 'test') {
      Logger.error(`[Shopify Error] Endpoint: ${endpointName}`, {
        errorType,
        status,
        timestamp
      });
    }

    return res.status(status).json({
      success: false,
      errorType,
      message,
      meta: {
        timestamp
      }
    });
  }

  /**
   * GET /api/shopify/install?shop=domain
   * Returns OAuth authorization URL in JSON contract so frontend can execute authenticated window redirect.
   */
  static async install(req, res, next) {
    try {
      const shop = req.query.shop;
      const { authUrl } = ShopifyService.generateAuthUrl(shop, req.user._id);

      return res.status(200).json({
        success: true,
        message: 'OAuth authorization URL generated successfully.',
        data: {
          redirectUrl: authUrl
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/install');
    }
  }

  /**
   * GET /api/shopify/callback
   */
  static async callback(req, res, next) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const result = await ShopifyService.handleOAuthCallback(req.query);
      CacheService.delByPattern(`shopify_*:${result.user._id}:*`);

      return res.redirect(`${frontendUrl}/dashboard/shopify?status=success`);
    } catch (error) {
      const statusType = error.errorType ? error.errorType.toLowerCase() : 'error';
      const validStatuses = ['cancelled', 'invalid_hmac', 'invalid_state', 'invalid_domain', 'error'];
      const statusParam = validStatuses.includes(statusType) ? statusType : 'error';
      return res.redirect(`${frontendUrl}/dashboard/shopify?status=${statusParam}`);
    }
  }

  /**
   * POST /api/shopify/connect (Legacy Token connect fallback)
   */
  static async connect(req, res, next) {
    try {
      const { storeDomain, accessToken, scopes } = req.body;

      if (!storeDomain || !accessToken) {
        return res.status(400).json({
          success: false,
          errorType: 'INVALID_DOMAIN',
          message: 'Both storeDomain and accessToken are required.',
          meta: {
            timestamp: new Date().toISOString()
          }
        });
      }

      const result = await ShopifyService.connectOrReconnect(
        req.user._id,
        storeDomain,
        accessToken,
        scopes
      );

      CacheService.delByPattern(`shopify_*:${req.user._id}:*`);

      res.status(200).json({
        success: true,
        message: 'Shopify store connected successfully.',
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
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
        message: 'Shopify connection status retrieved.',
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
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
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
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
        message: 'Shopify health status check completed.',
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/health');
    }
  }

  /**
   * Helper to parse and validate custom date range input.
   */
  static validateCustomDates(preset, startDate, endDate) {
    if (preset !== 'custom') return null;

    if (!startDate || !endDate) {
      return 'Start date and End date are required for custom date range.';
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return 'Invalid custom date range format. Use YYYY-MM-DD.';
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid custom date values.';
    }

    if (start > end) {
      return 'Start Date cannot be after End Date.';
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      return 'Maximum custom date range is 365 days.';
    }

    return null;
  }

  /**
   * GET /api/shopify/dashboard?preset=30d&startDate=...&endDate=...&refresh=true
   */
  static async getDashboardOverview(req, res, next) {
    try {
      const preset = req.query.preset || '30d';
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;

      const dateError = ShopifyController.validateCustomDates(preset, startDate, endDate);
      if (dateError) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: dateError
        });
      }

      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_dashboard:${req.user._id}:${preset}:${startDate || ''}:${endDate || ''}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const data = await ShopifyService.getDashboardOverview(req.user._id, preset, startDate, endDate);
      const payload = {
        success: true,
        message: 'Dashboard analytics overview retrieved.',
        data,
        meta: {
          preset,
          startDate,
          endDate,
          cached: false,
          lastUpdated: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      };

      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 300);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/dashboard');
    }
  }

  /**
   * GET /api/shopify/sales-trend?preset=30d&startDate=...&endDate=...&refresh=true
   */
  static async getSalesTrend(req, res, next) {
    try {
      const preset = req.query.preset || '30d';
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;

      const dateError = ShopifyController.validateCustomDates(preset, startDate, endDate);
      if (dateError) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: dateError
        });
      }

      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_trend:${req.user._id}:${preset}:${startDate || ''}:${endDate || ''}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const data = await ShopifyService.getSalesTrend(req.user._id, preset, startDate, endDate);
      const payload = {
        success: true,
        message: 'Sales trend analytics retrieved.',
        data,
        meta: {
          preset,
          startDate,
          endDate,
          cached: false,
          lastUpdated: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      };

      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 300);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/sales-trend');
    }
  }

  /**
   * GET /api/shopify/top-products?preset=30d&page=1&limit=10&startDate=...&endDate=...&refresh=true
   */
  static async getTopProducts(req, res, next) {
    try {
      const preset = req.query.preset || '30d';
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;

      const dateError = ShopifyController.validateCustomDates(preset, startDate, endDate);
      if (dateError) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: dateError
        });
      }

      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_products:${req.user._id}:${preset}:${startDate || ''}:${endDate || ''}:${page}:${limit}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const result = await ShopifyService.getTopProducts(req.user._id, preset, page, limit, startDate, endDate);
      const payload = {
        success: true,
        message: 'Top products analytics retrieved.',
        data: result.products,
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        currency: result.currency,
        meta: {
          preset,
          startDate,
          endDate,
          page: result.page,
          limit: result.limit,
          cached: false,
          lastUpdated: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      };

      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 300);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/top-products');
    }
  }

  /**
   * GET /api/shopify/recent-orders?preset=30d&page=1&limit=10&startDate=...&endDate=...&refresh=true
   */
  static async getRecentOrders(req, res, next) {
    try {
      const preset = req.query.preset || '30d';
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;

      const dateError = ShopifyController.validateCustomDates(preset, startDate, endDate);
      if (dateError) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: dateError
        });
      }

      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `shopify_orders:${req.user._id}:${preset}:${startDate || ''}:${endDate || ''}:${page}:${limit}`;

      if (forceRefresh) {
        CacheService.del(cacheKey);
      } else {
        const cached = CacheService.get(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      const result = await ShopifyService.getRecentOrders(req.user._id, page, limit, preset, startDate, endDate);
      const payload = {
        success: true,
        message: 'Recent orders retrieved.',
        data: result.orders,
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        currency: result.currency,
        meta: {
          preset,
          startDate,
          endDate,
          page: result.page,
          limit: result.limit,
          cached: false,
          lastUpdated: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      };

      CacheService.set(cacheKey, { ...payload, meta: { ...payload.meta, cached: true } }, 300);

      res.status(200).json(payload);
    } catch (error) {
      ShopifyController.handleError(res, error, 'GET /api/shopify/recent-orders');
    }
  }
}

export default ShopifyController;
