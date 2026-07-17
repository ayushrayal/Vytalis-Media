import { Router } from 'express';
import UserController from '../controllers/userController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Require auth for all user routes
router.use(authMiddleware);

router.get('/dashboard-preferences', UserController.getDashboardPreferences);
router.put('/dashboard-preferences', UserController.updateDashboardPreferences);
router.post('/dashboard-preferences/reset', UserController.resetDashboardPreferences);

export default router;
