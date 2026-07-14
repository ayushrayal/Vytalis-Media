import { Router } from 'express';
import CampaignController from '../controllers/campaignController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Apply auth middleware to all campaign endpoints
router.use(authMiddleware);

router.get('/', CampaignController.getCampaigns);
router.get('/export', CampaignController.exportCampaigns);
router.get('/:campaignId', CampaignController.getCampaignDetails);

export default router;
