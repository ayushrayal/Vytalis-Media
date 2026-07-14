import { Router } from 'express';
import CampaignController from '../controllers/campaignController.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

// Apply auth middleware to all campaign endpoints
router.use(authMiddleware);

router.get('/', CampaignController.getCampaigns);
router.get('/export', CampaignController.exportCampaigns);
router.get('/:campaignId', CampaignController.getCampaignDetails);

// Lazy/progressive details endpoints
router.get('/:campaignId/trends', CampaignController.getCampaignTrends);
router.get('/:campaignId/creatives', CampaignController.getCampaignCreatives);
router.get('/:campaignId/breakdowns', CampaignController.getCampaignBreakdowns);
router.get('/:campaignId/adsets', CampaignController.getCampaignAdSets);
router.get('/:campaignId/recommendations', CampaignController.getCampaignRecommendations);

export default router;
