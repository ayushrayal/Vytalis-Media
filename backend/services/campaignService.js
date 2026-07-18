import MetaService from './metaService.js';
import { campaignFields } from '../config/metaFields.js';
import CreativeService from './creativeService.js';
import CacheService from './cacheService.js';

class CampaignService {
  /**
   * Fetch campaigns for a given account and filter by OUTCOME_SALES objective
   */
  static async getSalesCampaigns(user) {
    if (!user || !user.metaAccountId) {
      const err = new Error('Meta Ad Account ID or Access Token is missing. Please update your profile.');
      err.errorType = 'META_TOKEN_MISSING';
      err.status = 400;
      throw err;
    }
    const accountId = String(user.metaAccountId);
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const endpoint = `${formattedAccountId}/campaigns`;
    
    const params = {
      fields: campaignFields,
      limit: 1000
    };

    const response = await MetaService.get(endpoint, user, params, { resourceType: 'campaign' });
    
    // Filter campaigns by OUTCOME_SALES objective only (ignore others as required)
    const campaigns = response.data || [];
    return campaigns.filter(c => c.objective === 'OUTCOME_SALES');
  }

  static async getCampaigns(user) {
    return this.getSalesCampaigns(user);
  }

  /**
   * Fetch details for a single campaign
   */
  static async getCampaignById(user, campaignId) {
    const params = {
      fields: campaignFields
    };
    return await MetaService.get(campaignId, user, params, { resourceType: 'campaign' });
  }

  /**
   * Fetch base campaign data (metadata, linked creatives, and ad sets) and cache for 6 hours
   */
  static async getCampaignBaseData(user, campaignId) {
    const cacheKey = `campaign_base::${campaignId}`;
    const cached = CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const campaign = await this.getCampaignById(user, campaignId);
    
    const allSalesCreatives = await CreativeService.getSalesCreatives(user, false);
    const creatives = allSalesCreatives.filter(c =>
      c.ads.some(ad => ad.campaignId === campaignId)
    );

    const adsetRes = await MetaService.get(`${campaignId}/adsets`, user, {
      fields: 'id,name,status,created_time',
      limit: 1000
    }, { resourceType: 'adset' });
    const adSets = adsetRes.data || [];

    const baseData = { campaign, creatives, adSets };
    CacheService.set(cacheKey, baseData, 21600); // 6 hours
    return baseData;
  }
}

export default CampaignService;
