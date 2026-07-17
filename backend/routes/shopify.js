import { Router } from 'express';
import ShopifyController from '../controllers/shopifyController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Protect all Shopify routes with auth middleware
router.use(authMiddleware);

// Connection & Credentials
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
