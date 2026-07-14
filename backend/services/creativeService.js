import MetaService from './metaService.js';
import CampaignService from './campaignService.js';
import MediaService from './mediaService.js';

class CreativeService {
  /**
   * Fetch all unique creatives running inside OUTCOME_SALES campaigns, enriched with high-res media.
   */
  static async getSalesCreatives(user) {
    // 1. Get Sales campaigns
    const salesCampaigns = await CampaignService.getSalesCampaigns(user);
    const salesCampaignIds = new Set(salesCampaigns.map(c => c.id));

    if (salesCampaignIds.size === 0) {
      return [];
    }

    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    // 2. Fetch ads with creative details
    const adsResponse = await MetaService.get(`${formattedAccountId}/ads`, user, {
      fields: 'id,name,status,campaign_id,adset_id,campaign{id,name,objective},adset{id,name},creative{id,name,image_url,thumbnail_url,video_id,body}',
      limit: 250
    });

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
        adsetName: ad.adset?.name || 'Unnamed Ad Set'
      });
    });

    // Convert map to array
    const rawCreatives = Array.from(creativeMap.values());

    // 5. Enrich creatives with high-resolution media URLs (via MediaService)
    const enrichedCreatives = await MediaService.enrichCreativeAssets(rawCreatives, user);

    // Merge the ads lists back into enriched creatives
    return enrichedCreatives.map(ec => {
      const original = creativeMap.get(ec.id);
      return {
        ...ec,
        ads: original.ads
      };
    });
  }
}

export default CreativeService;
