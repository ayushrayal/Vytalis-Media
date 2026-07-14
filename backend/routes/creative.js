import { Router } from 'express';
import CreativeController from '../controllers/creativeController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Apply auth middleware to all creative endpoints
router.use(authMiddleware);

router.get('/', CreativeController.getCreatives);
router.get('/videos', CreativeController.getVideos);
router.get('/statics', CreativeController.getStatics);
router.get('/:id', CreativeController.getCreativeById);

export default router;
