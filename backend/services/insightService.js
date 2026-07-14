import MetaService from './metaService.js';
import CampaignService from './campaignService.js';

class InsightService {
  /**
   * Helper to parse actions array
   */
  static getActionValue(actions, actionType) {
    if (!actions || !Array.isArray(actions)) return 0;
    const match = actions.find(a => a.action_type === actionType);
    return match ? parseFloat(match.value || 0) : 0;
  }

  /**
   * Extract purchase events without double-counting (prioritize standard 'purchase', fallback to pixel purchase)
   */
  static getPurchaseActions(actions) {
    if (!actions || !Array.isArray(actions)) return 0;

    const purchaseAction = actions.find(a => a.action_type === 'purchase');
    if (purchaseAction) {
      return parseFloat(purchaseAction.value || 0);
    }

    const pixelPurchaseAction = actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase');
    if (pixelPurchaseAction) {
      return parseFloat(pixelPurchaseAction.value || 0);
    }

    return 0;
  }

  /**
   * Helper to parse specific video action arrays (e.g., video_thruplay_watched_actions)
   */
  static getVideoActionValue(fieldData) {
    if (!fieldData || !Array.isArray(fieldData)) return 0;
    return parseFloat(fieldData[0]?.value || 0);
  }

  /**
   * Fetch ad-level insights for a given time range, filtered to OUTCOME_SALES campaigns
   */
  static async getAdInsights(user, timeRange) {
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    // 1. Get campaigns filtered by OUTCOME_SALES
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = salesCampaigns.map(c => c.id);

    if (salesCampaignIds.length === 0) {
      return [];
    }

    // 2. Fetch ad-level insights with campaign filtering pushed to Meta API
    const endpoint = `${formattedAccountId}/insights`;
    const params = {
      level: 'ad',
      fields: 'ad_id,ad_name,campaign_id,spend,impressions,clicks,inline_link_clicks,reach,frequency,actions,action_values,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_play_actions,video_avg_time_watched_actions',
      filtering: [{ field: 'campaign.id', operator: 'IN', value: salesCampaignIds }],
      time_range: timeRange,
      limit: 1000
    };

    const response = await MetaService.get(endpoint, user, params);
    return response.data || [];
  }

  /**
   * Fetch de-duplicated account-level insights for OUTCOME_SALES campaigns
   */
  static async getAccountAggregatedInsights(user, timeRange) {
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    // 1. Get campaigns filtered by OUTCOME_SALES
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = salesCampaigns.map(c => c.id);

    if (salesCampaignIds.length === 0) {
      return null;
    }

    // 2. Fetch account-level insights directly
    const endpoint = `${formattedAccountId}/insights`;
    const params = {
      level: 'account',
      fields: 'spend,impressions,clicks,inline_link_clicks,reach,frequency,actions,action_values,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_play_actions,video_avg_time_watched_actions',
      filtering: [{ field: 'campaign.id', operator: 'IN', value: salesCampaignIds }],
      time_range: timeRange
    };

    const response = await MetaService.get(endpoint, user, params);
    return response.data?.[0] || null;
  }

  /**
   * Aggregate list of insights into a single KPI summary object
   */
  static aggregateInsights(insightsList) {
    // Normalization: convert single object to array if needed
    const list = Array.isArray(insightsList) ? insightsList : (insightsList ? [insightsList] : []);

    const summary = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      linkClicks: 0,
      reach: 0,
      purchases: 0,
      purchaseConversionValue: 0,
      videoPlays: 0,
      video3SecViews: 0,
      thruPlays: 0,
      videoP25: 0,
      videoP50: 0,
      videoP75: 0,
      videoP100: 0,
      totalVideoWatchTime: 0,
      frequencySum: 0,
      frequencyCount: 0
    };

    list.forEach(ins => {
      summary.spend += parseFloat(ins.spend || 0);
      summary.impressions += parseInt(ins.impressions || 0, 10);
      summary.clicks += parseInt(ins.clicks || 0, 10);
      
      // Link Clicks fallback to clicks or action 'link_click'
      const rawLinkClicks = parseInt(ins.inline_link_clicks || 0, 10) || this.getActionValue(ins.actions, 'link_click');
      summary.linkClicks += rawLinkClicks;
      
      summary.reach += parseInt(ins.reach || 0, 10);
      
      summary.purchases += this.getPurchaseActions(ins.actions);
      summary.purchaseConversionValue += this.getPurchaseActions(ins.action_values);

      // Video metrics
      summary.videoPlays += this.getVideoActionValue(ins.video_play_actions);
      summary.video3SecViews += this.getActionValue(ins.actions, 'video_view');
      summary.thruPlays += this.getVideoActionValue(ins.video_thruplay_watched_actions);
      summary.videoP25 += this.getVideoActionValue(ins.video_p25_watched_actions);
      summary.videoP50 += this.getVideoActionValue(ins.video_p50_watched_actions);
      summary.videoP75 += this.getVideoActionValue(ins.video_p75_watched_actions);
      summary.videoP100 += this.getVideoActionValue(ins.video_p100_watched_actions);

      // Average watch time
      const avgWatchTime = this.getVideoActionValue(ins.video_avg_time_watched_actions);
      const videoPlays = this.getVideoActionValue(ins.video_play_actions);
      summary.totalVideoWatchTime += avgWatchTime * videoPlays;

      if (ins.frequency) {
        summary.frequencySum += parseFloat(ins.frequency);
        summary.frequencyCount++;
      }
    });

    // Compute derived rates matching Meta Ads Manager calculations
    const ctr = summary.impressions > 0 ? (summary.linkClicks / summary.impressions) * 100 : 0;
    const cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0;
    const cpc = summary.linkClicks > 0 ? summary.spend / summary.linkClicks : 0;
    const cpa = summary.purchases > 0 ? summary.spend / summary.purchases : 0;
    const roas = summary.spend > 0 ? summary.purchaseConversionValue / summary.spend : 0;

    // Use aggregate reach de-duplication frequency if available, else average
    const frequency = (summary.reach > 0 && list.length === 1) 
      ? parseFloat(list[0].frequency || (summary.impressions / summary.reach))
      : (summary.reach > 0 ? summary.impressions / summary.reach : (summary.frequencyCount > 0 ? summary.frequencySum / summary.frequencyCount : 1));

    // Video derived rates
    const hookRate = summary.impressions > 0 ? (summary.video3SecViews / summary.impressions) * 100 : 0;
    const holdRate = summary.impressions > 0 ? (summary.thruPlays / summary.impressions) * 100 : 0;
    const retentionRate = summary.videoPlays > 0 ? (summary.videoP50 / summary.videoPlays) * 100 : 0;
    const averageWatchTime = summary.videoPlays > 0 ? summary.totalVideoWatchTime / summary.videoPlays : 0;

    return {
      spend: summary.spend,
      impressions: summary.impressions,
      clicks: summary.clicks,
      linkClicks: summary.linkClicks,
      reach: summary.reach,
      purchases: summary.purchases,
      purchaseConversionValue: summary.purchaseConversionValue,
      cpa,
      roas,
      ctr,
      cpm,
      cpc,
      frequency,
      videoPlays: summary.videoPlays,
      video3SecViews: summary.video3SecViews,
      thruPlays: summary.thruPlays,
      videoP25: summary.videoP25,
      videoP50: summary.videoP50,
      videoP75: summary.videoP75,
      videoP100: summary.videoP100,
      hookRate,
      holdRate,
      retentionRate,
      averageWatchTime
    };
  }
}

export default InsightService;
