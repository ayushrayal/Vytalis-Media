import { Router } from 'express';
import AIController from '../controllers/aiController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Apply auth middleware to protect AI service endpoints
router.use(authMiddleware);

router.post('/creative', AIController.auditCreative);
router.post('/script', AIController.generateScript);
router.post('/hooks', AIController.generateHooks);

export default router;
