import CacheService from '../services/cacheService.js';
import CampaignService from '../services/campaignService.js';
import InsightService from '../services/insightService.js';
import MetaService from '../services/metaService.js';
import DateHelper from '../utils/dateHelper.js';
import { adSetFields } from '../config/metaFields.js';

class AdsetController {
  /**
   * GET /api/adsets
   * Returns sales-campaign ad sets enriched with metrics for the selected period.
   */
  static async getAdsets(req, res, next) {
    try {
      const { preset = 'last_7_days', since, until, search = '' } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(preset, customRange);
      const accountId = user.metaAccountId;
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), 'adsets/list', {
        accountId,
        preset,
        current
      });

      const allAdsets = await CacheService.getOrFetch(cacheKey, async () => {
        const campaigns = await CampaignService.getSalesCampaigns(user);
        const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
        if (campaignIds.size === 0) return [];

        const [adsetsResponse, insightsResponse] = await Promise.all([
          MetaService.get(`${formattedAccountId}/adsets`, user, {
            fields: adSetFields,
            limit: 1000
          }, { resourceType: 'adset' }),
          MetaService.get(`${formattedAccountId}/insights`, user, {
            level: 'adset',
            fields: 'adset_id,adset_name,campaign_id,spend,impressions,clicks,inline_link_clicks,reach,frequency,actions,action_values',
            filtering: [{ field: 'campaign.id', operator: 'IN', value: [...campaignIds] }],
            time_range: current,
            limit: 1000
          }, { resourceType: 'adset' })
        ]);

        const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
        const insightsMap = new Map((insightsResponse.data || []).map((insight) => [insight.adset_id, insight]));

        return (adsetsResponse.data || [])
          .filter((adset) => campaignIds.has(adset.campaign_id))
          .map((adset) => {
            const insight = insightsMap.get(adset.id) || {};
            const spend = parseFloat(insight.spend || 0);
            const impressions = parseInt(insight.impressions || 0, 10);
            const reach = parseInt(insight.reach || 0, 10);
            const clicks = parseInt(insight.clicks || 0, 10);
            const linkClicks = parseInt(insight.inline_link_clicks || 0, 10) || InsightService.getActionValue(insight.actions, 'link_click');
            const addsToCart = InsightService.getAddToCartActions(insight.actions);
            const checkoutInitiated = InsightService.getInitiateCheckoutActions(insight.actions);
            const purchases = InsightService.getPurchaseActions(insight.actions);
            const purchaseConversionValue = InsightService.getPurchaseActions(insight.action_values);
            const campaign = campaignMap.get(adset.campaign_id);

            return {
              id: adset.id,
              name: adset.name || insight.adset_name || 'Unnamed Ad Set',
              status: adset.status || 'PAUSED',
              campaignId: adset.campaign_id,
              campaignName: campaign?.name || 'Unnamed Campaign',
              spend,
              reach,
              impressions,
              frequency: reach > 0 ? impressions / reach : parseFloat(insight.frequency || 0),
              ctr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
              cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
              cpc: linkClicks > 0 ? spend / linkClicks : 0,
              addsToCart,
              checkoutInitiated,
              purchases,
              purchaseConversionValue,
              roas: spend > 0 ? purchaseConversionValue / spend : 0
            };
          })
          .sort((a, b) => b.spend - a.spend);
      }, 'campaigns');

      const normalizedSearch = search.trim().toLowerCase();
      const data = normalizedSearch
        ? allAdsets.filter((adset) => [adset.name, adset.id, adset.campaignName, adset.campaignId]
          .some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))
        : allAdsets;

      res.status(200).json({
        success: true,
        data,
        meta: {
          generatedAt: new Date().toISOString(),
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdsetController;
