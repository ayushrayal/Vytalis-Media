import { Router } from 'express';
import ShopifyController from '../controllers/shopifyController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Public OAuth Callback route (validated via HMAC signature & signed state token)
router.get('/callback', ShopifyController.callback);

// Deprecated Callback Alias with 301 Redirect for Backward Compatibility
router.get('/auth/callback', (req, res) => {
  console.log('[Deprecated Shopify Callback]', req.originalUrl);
  const queryString = new URLSearchParams(req.query).toString();
  const target = '/api/shopify/callback' + (queryString ? `?${queryString}` : '');
  return res.redirect(301, target);
});

// Protected routes (require user JWT authentication)
router.use(authMiddleware);

// OAuth Initiation Route
router.get('/install', ShopifyController.install);

// Connection & Status Management
router.post('/connect', ShopifyController.connect);
router.get('/status', ShopifyController.getStatus);
router.post('/disconnect', ShopifyController.disconnect);
router.get('/health', ShopifyController.checkHealth);

// Analytics Dashboard Endpoints
router.get('/dashboard', ShopifyController.getDashboardOverview);
router.get('/sales-trend', ShopifyController.getSalesTrend);
router.get('/top-products', ShopifyController.getTopProducts);
router.get('/recent-orders', ShopifyController.getRecentOrders);

export default router;
