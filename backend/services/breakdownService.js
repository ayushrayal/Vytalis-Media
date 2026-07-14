import MetaService from './metaService.js';
import CampaignService from './campaignService.js';
import InsightService from './insightService.js';

class BreakdownService {
  /**
   * Fetch and aggregate insights by Age (using de-duplicated account level insights)
   */
  static async getAgeBreakdown(user, timeRange) {
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = salesCampaigns.map(c => c.id);

    if (salesCampaignIds.length === 0) {
      return [];
    }

    const endpoint = `${formattedAccountId}/insights`;
    const params = {
      level: 'account',
      breakdowns: 'age',
      fields: 'spend,impressions,clicks,actions,action_values',
      filtering: [{ field: 'campaign.id', operator: 'IN', value: salesCampaignIds }],
      time_range: timeRange,
      limit: 1000
    };

    const response = await MetaService.get(endpoint, user, params);
    const data = response.data || [];

    return data.map(item => {
      const ageGroup = item.age || 'Unknown';
      const spend = parseFloat(item.spend || 0);
      const impressions = parseInt(item.impressions || 0, 10);
      const clicks = parseInt(item.clicks || 0, 10);
      const purchases = InsightService.getPurchaseActions(item.actions);
      const purchaseConversionValue = InsightService.getPurchaseActions(item.action_values);

      const cpa = purchases > 0 ? spend / purchases : 0;
      const roas = spend > 0 ? purchaseConversionValue / spend : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;

      return {
        age: ageGroup,
        age_range: ageGroup,
        spend,
        impressions,
        clicks,
        purchases,
        purchaseConversionValue,
        cpa,
        roas,
        ctr,
        cpm,
        cpc
      };
    }).sort((a, b) => a.age.localeCompare(b.age));
  }

  /**
   * Fetch and aggregate insights by Placement (using de-duplicated account level insights)
   */
  static async getPlacementBreakdown(user, timeRange) {
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = salesCampaigns.map(c => c.id);

    if (salesCampaignIds.length === 0) {
      return [];
    }

    const endpoint = `${formattedAccountId}/insights`;
    const params = {
      level: 'account',
      breakdowns: 'publisher_platform,platform_position',
      fields: 'spend,impressions,clicks,actions,action_values',
      filtering: [{ field: 'campaign.id', operator: 'IN', value: salesCampaignIds }],
      time_range: timeRange,
      limit: 1000
    };

    const response = await MetaService.get(endpoint, user, params);
    const data = response.data || [];

    const placementMap = {};

    data.forEach(item => {
      const platform = item.publisher_platform || 'other';
      const position = item.platform_position || 'other';
      
      // Classify into user-friendly names
      let category = 'Other Placements';
      if (platform === 'facebook') {
        if (position.includes('feed')) category = 'Facebook Feed';
        else if (position.includes('story') || position.includes('stories')) category = 'Facebook Stories';
        else if (position.includes('reel') || position.includes('reels')) category = 'Facebook Reels';
      } else if (platform === 'instagram') {
        if (position.includes('feed')) category = 'Instagram Feed';
        else if (position.includes('story') || position.includes('stories')) category = 'Instagram Stories';
        else if (position.includes('reel') || position.includes('reels')) category = 'Instagram Reels';
      } else if (platform === 'messenger') {
        category = 'Messenger';
      } else if (platform === 'audience_network') {
        category = 'Audience Network';
      } else if (position.includes('reel') || position.includes('reels')) {
        category = 'Reels (Other)';
      } else if (position.includes('story') || position.includes('stories')) {
        category = 'Stories (Other)';
      }

      if (!placementMap[category]) {
        placementMap[category] = {
          placement: category,
          spend: 0,
          impressions: 0,
          clicks: 0,
          purchases: 0,
          purchaseConversionValue: 0
        };
      }

      placementMap[category].spend += parseFloat(item.spend || 0);
      placementMap[category].impressions += parseInt(item.impressions || 0, 10);
      placementMap[category].clicks += parseInt(item.clicks || 0, 10);
      placementMap[category].purchases += InsightService.getPurchaseActions(item.actions);
      placementMap[category].purchaseConversionValue += InsightService.getPurchaseActions(item.action_values);
    });

    // Format output with rates
    return Object.values(placementMap).map(place => {
      const cpa = place.purchases > 0 ? place.spend / place.purchases : 0;
      const roas = place.spend > 0 ? place.purchaseConversionValue / place.spend : 0;
      const ctr = place.impressions > 0 ? (place.clicks / place.impressions) * 100 : 0;
      const cpm = place.impressions > 0 ? (place.spend / place.impressions) * 1000 : 0;
      const cpc = place.clicks > 0 ? place.spend / place.clicks : 0;

      return {
        ...place,
        cpa,
        roas,
        ctr,
        cpm,
        cpc
      };
    }).sort((a, b) => b.spend - a.spend); // Sort by spend descending
  }
}

export default BreakdownService;
