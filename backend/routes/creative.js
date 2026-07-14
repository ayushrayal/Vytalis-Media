import { Router } from 'express';
import CreativeController from '../controllers/creativeController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Apply auth middleware to all creative endpoints
router.use(authMiddleware);

router.get('/', CreativeController.getCreatives);
router.get('/videos', CreativeController.getVideos);
router.get('/statics', CreativeController.getStatics);
router.get('/winners', CreativeController.getWinners);
router.get('/poor-performers', CreativeController.getPoorPerformers);

router.get('/:id', CreativeController.getCreativeById);
router.get('/:id/performance', CreativeController.getCreativePerformance);
router.get('/:id/timeline', CreativeController.getCreativeTimeline);
router.get('/:id/recommendations', CreativeController.getCreativeRecommendations);
router.get('/:id/insights', CreativeController.getCreativeInsights);


export default router;
