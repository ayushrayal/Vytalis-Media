import { Router } from 'express';
import DashboardController from '../controllers/dashboardController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Apply auth middleware to all dashboard endpoints
router.use(authMiddleware);

router.get('/overview', DashboardController.getOverview);
router.get('/trends', DashboardController.getTrends);
router.get('/charts', DashboardController.getCharts);
router.get('/comparison', DashboardController.getComparison);
router.get('/breakdowns', DashboardController.getBreakdowns);

export default router;
