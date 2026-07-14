import MetaService from './metaService.js';
import CampaignService from './campaignService.js';
import InsightService from './insightService.js';

class ChartService {
  /**
   * Fetch daily timeline data for Recharts
   */
  static async getDailyTrends(user, timeRange) {
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    // 1. Get Sales campaigns
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = new Set(salesCampaigns.map(c => c.id));

    if (salesCampaignIds.size === 0) {
      return [];
    }

    // Calculate total campaign daily budget as a reference
    let totalDailyBudget = 0;
    salesCampaigns.forEach(c => {
      if (c.status === 'ACTIVE') {
        const budget = parseFloat(c.daily_budget || c.lifetime_budget || 0);
        totalDailyBudget += budget > 1000 ? budget / 100 : budget;
      }
    });

    // 2. Fetch daily account insights (automatically groups and de-duplicates by day)
    const endpoint = `${formattedAccountId}/insights`;
    const params = {
      level: 'account',
      time_increment: 1, // Get daily breakdown
      fields: 'spend,impressions,clicks,actions,action_values,date_start',
      filtering: [{ field: 'campaign.id', operator: 'IN', value: Array.from(salesCampaignIds) }],
      time_range: timeRange,
      limit: 1000
    };

    const response = await MetaService.get(endpoint, user, params);
    const salesData = response.data || [];

    // Format daily data points for Recharts
    const trendData = salesData.map(day => {
      const spend = parseFloat(day.spend || 0);
      const impressions = parseInt(day.impressions || 0, 10);
      const clicks = parseInt(day.clicks || 0, 10);
      const purchases = InsightService.getPurchaseActions(day.actions);
      const purchaseConversionValue = InsightService.getPurchaseActions(day.action_values);

      const cpa = purchases > 0 ? spend / purchases : 0;
      const roas = spend > 0 ? purchaseConversionValue / spend : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

      return {
        date: day.date_start,
        spend: parseFloat(spend.toFixed(2)),
        purchases,
        cpa: parseFloat(cpa.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
        ctr: parseFloat(ctr.toFixed(2)),
        cpm: parseFloat(cpm.toFixed(2)),
        purchaseConversionValue: parseFloat(purchaseConversionValue.toFixed(2)),
        budget: totalDailyBudget // Reference budget line
      };
    });

    // Sort chronologically
    return trendData.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

export default ChartService;
