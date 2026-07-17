import { Router } from 'express';
import AdsetController from '../controllers/adsetController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);
router.get('/', AdsetController.getAdsets);

export default router;
