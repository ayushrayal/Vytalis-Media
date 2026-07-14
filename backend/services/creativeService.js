import MetaService from './metaService.js';
import CampaignService from './campaignService.js';
import MediaService from './mediaService.js';
import InsightService from './insightService.js';
import RecommendationService from './recommendationService.js';
import { adFields } from '../config/metaFields.js';

class CreativeService {
  /**
   * Fetch all unique creatives running inside OUTCOME_SALES campaigns, enriched with high-res media.
   */
  static async getSalesCreatives(user, forceEnrich = false) {
    // 1. Get Sales campaigns
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = new Set(salesCampaigns.map(c => c.id));

    if (salesCampaignIds.size === 0) {
      return [];
    }

    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    // 2. Fetch ads with creative details using centralized fields
    const adsResponse = await MetaService.get(`${formattedAccountId}/ads`, user, {
      fields: adFields.join(','),
      limit: 250
    }, { resourceType: 'ad' });

    const ads = adsResponse.data || [];
    
    // 3. Filter ads to only include those in Sales campaigns
    const salesAds = ads.filter(ad => salesCampaignIds.has(ad.campaign_id));

    // 4. Extract unique creatives and map them to their running ads/campaigns/adsets
    const creativeMap = new Map();

    salesAds.forEach(ad => {
      if (!ad.creative || !ad.creative.id) return;
      
      const creativeId = ad.creative.id;
      
      if (!creativeMap.has(creativeId)) {
        creativeMap.set(creativeId, {
          id: creativeId,
          name: ad.creative.name || 'Unnamed Creative',
          image_url: ad.creative.image_url,
          thumbnail_url: ad.creative.thumbnail_url,
          video_id: ad.creative.video_id,
          object_story_spec: ad.creative.object_story_spec,
          asset_feed_spec: ad.creative.asset_feed_spec,
          product_set_id: ad.creative.product_set_id,
          created_time: ad.creative.created_time || null,
          ads: []
        });
      }

      creativeMap.get(creativeId).ads.push({
        adId: ad.id,
        adName: ad.name,
        adStatus: ad.status,
        campaignId: ad.campaign_id,
        campaignName: ad.campaign?.name || 'Unnamed Campaign',
        adsetId: ad.adset_id,
        adsetName: ad.adset?.name || 'Unnamed Ad Set',
        createdTime: ad.created_time
      });
    });

    // Convert map to array
    const rawCreatives = Array.from(creativeMap.values());

    // 5. Enrich creatives with high-resolution media URLs (via MediaService)
    const enrichedCreatives = await MediaService.enrichCreativeAssets(rawCreatives, user, forceEnrich);

    // Merge the ads lists back into enriched creatives and derive created_time
    return enrichedCreatives.map(ec => {
      const original = creativeMap.get(ec.id);
      
      // Derive creation date from the earliest linked ad
      const earliestAdTime = original.ads.reduce((min, curr) => {
        if (!curr.createdTime) return min;
        return (!min || new Date(curr.createdTime) < new Date(min)) ? curr.createdTime : min;
      }, null);

      return {
        ...ec,
        created_time: earliestAdTime || ec.created_time || null,
        ads: original.ads
      };
    });
  }

  /**
   * Fetch a single creative by ID and run dedicated enrichment
   */
  static async getCreativeById(user, creativeId) {
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

    // Get Sales campaigns
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = new Set(salesCampaigns.map(c => c.id));
    if (salesCampaignIds.size === 0) return null;

    // Fetch ads
    const adsResponse = await MetaService.get(`${formattedAccountId}/ads`, user, {
      fields: adFields.join(','),
      limit: 250
    }, { resourceType: 'ad' });

    const ads = adsResponse.data || [];
    
    // Filter to matching ads
    const matchingAds = ads.filter(ad => ad.creative && ad.creative.id === creativeId && salesCampaignIds.has(ad.campaign_id));
    if (matchingAds.length === 0) return null;

    // Construct raw creative
    const firstAd = matchingAds[0];
    const rawCreative = {
      id: creativeId,
      name: firstAd.creative.name || 'Unnamed Creative',
      image_url: firstAd.creative.image_url,
      thumbnail_url: firstAd.creative.thumbnail_url,
      video_id: firstAd.creative.video_id,
      object_story_spec: firstAd.creative.object_story_spec,
      asset_feed_spec: firstAd.creative.asset_feed_spec,
      product_set_id: firstAd.creative.product_set_id,
      created_time: firstAd.creative.created_time || null,
      ads: matchingAds.map(ad => ({
        adId: ad.id,
        adName: ad.name,
        adStatus: ad.status,
        campaignId: ad.campaign_id,
        campaignName: ad.campaign?.name || 'Unnamed Campaign',
        adsetId: ad.adset_id,
        adsetName: ad.adset?.name || 'Unnamed Ad Set',
        createdTime: ad.created_time
      }))
    };

    // Enrich single creative (with forceEnrich = true)
    const enriched = await MediaService.enrichCreativeAssets([rawCreative], user, true);
    const result = enriched[0];

    const earliestAdTime = rawCreative.ads.reduce((min, curr) => {
      if (!curr.createdTime) return min;
      return (!min || new Date(curr.createdTime) < new Date(min)) ? curr.createdTime : min;
    }, null);

    return {
      ...result,
      created_time: earliestAdTime || result.created_time || null,
      ads: rawCreative.ads
    };
  }

  /**
   * Fetch single creative performance metrics specifically filtered by its linked ads
   */
  static async getCreativePerformance(user, creativeId, timeRange) {
    const creative = await this.getCreativeById(user, creativeId);
    if (!creative) return null;

    const adIds = creative.ads.map(ad => ad.adId);
    if (adIds.length === 0) return {};

    const adInsights = await InsightService.getAdInsights(user, timeRange, adIds);
    return InsightService.aggregateInsights(adInsights);
  }

  /**
   * Fetch single creative daily timeline historical trends specifically filtered by its linked ads
   */
  static async getCreativeTimeline(user, creativeId, timeRange) {
    const creative = await this.getCreativeById(user, creativeId);
    if (!creative) return null;

    const adIds = creative.ads.map(ad => ad.adId);
    if (adIds.length === 0) return [];

    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    const response = await MetaService.get(`${formattedAccountId}/insights`, user, {
      level: 'ad',
      time_increment: 1,
      fields: 'ad_id,spend,impressions,clicks,actions,action_values,date_start',
      filtering: [{ field: 'ad.id', operator: 'IN', value: adIds }],
      time_range: timeRange,
      limit: 1000
    });

    const dailyMap = new Map();
    (response.data || []).forEach(item => {
      const date = item.date_start;
      const spend = parseFloat(item.spend || 0);
      const clicks = parseInt(item.clicks || 0, 10);
      const impressions = parseInt(item.impressions || 0, 10);
      const purchases = InsightService.getPurchaseActions(item.actions);
      const value = InsightService.getPurchaseActions(item.action_values);

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, spend: 0, clicks: 0, impressions: 0, purchases: 0, revenue: 0 });
      }

      const entry = dailyMap.get(date);
      entry.spend += spend;
      entry.clicks += clicks;
      entry.impressions += impressions;
      entry.purchases += purchases;
      entry.revenue += value;
    });

    const timeline = Array.from(dailyMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    return timeline.map(day => {
      const ctr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0;
      const roas = day.spend > 0 ? day.revenue / day.spend : 0;
      const cpa = day.purchases > 0 ? day.spend / day.purchases : 0;
      return {
        ...day,
        ctr: parseFloat(ctr.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
        cpa: parseFloat(cpa.toFixed(2))
      };
    });
  }

  /**
   * Fetch recommendations specifically for a single creative
   */
  static async getCreativeRecommendations(user, creativeId, timeRange) {
    const creative = await this.getCreativeById(user, creativeId);
    if (!creative) return null;

    const metrics = await this.getCreativePerformance(user, creativeId, timeRange);
    return RecommendationService.generateCreativeRecommendations(metrics, creative);
  }
}

export default CreativeService;
