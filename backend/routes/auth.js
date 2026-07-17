import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import ShopifyController from '../controllers/shopifyController.js';
import authMiddleware from '../middlewares/auth.js';
import authLimiter from '../middlewares/rateLimiter.js';

const router = Router();

// Deprecated Callback Handling with 301 Redirects for Backward Compatibility
const handleDeprecatedCallback = (req, res) => {
  console.log('[Deprecated Shopify Callback]', req.originalUrl);
  const queryString = new URLSearchParams(req.query).toString();
  const target = '/api/shopify/callback' + (queryString ? `?${queryString}` : '');
  return res.redirect(301, target);
};

router.get('/callback', handleDeprecatedCallback);
router.get('/shopify/callback', handleDeprecatedCallback);

// Public routes with rate limiting
router.post('/login', authLimiter, AuthController.login);
router.post('/signup', authLimiter, AuthController.signup);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);
router.put('/profile', authMiddleware, AuthController.updateProfile);

export default router;
