import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import ShopifyController from '../controllers/shopifyController.js';
import authMiddleware from '../middlewares/auth.js';
import authLimiter from '../middlewares/rateLimiter.js';

const router = Router();

// Public OAuth callback aliases
router.get('/callback', ShopifyController.callback);
router.get('/shopify/callback', ShopifyController.callback);

// Public routes with rate limiting
router.post('/login', authLimiter, AuthController.login);
router.post('/signup', authLimiter, AuthController.signup);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);
router.put('/profile', authMiddleware, AuthController.updateProfile);

export default router;
