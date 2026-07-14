import MetaService from './metaService.js';
import { campaignFields } from '../config/metaFields.js';

class CampaignService {
  /**
   * Fetch campaigns for a given account and filter by OUTCOME_SALES objective
   */
  static async getSalesCampaigns(user) {
    const accountId = user.metaAccountId;
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

  /**
   * Fetch details for a single campaign
   */
  static async getCampaignById(user, campaignId) {
    const params = {
      fields: campaignFields
    };
    return await MetaService.get(campaignId, user, params, { resourceType: 'campaign' });
  }
}

export default CampaignService;
