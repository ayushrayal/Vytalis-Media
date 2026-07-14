import CampaignService from '../services/campaignService.js';
import InsightService from '../services/insightService.js';
import CreativeService from '../services/creativeService.js';
import AnalyticsService from '../services/analyticsService.js';
import CacheService from '../services/cacheService.js';
import MetaService from '../services/metaService.js';
import DateHelper from '../utils/dateHelper.js';

class CampaignController {
  /**
   * Helper to format double-digit numbers
   */
  static pad(num) {
    return num.toString().padStart(2, '0');
  }

  /**
   * Helper to format dates as YYYY-MM-DD
   */
  static formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  }

  /**
   * GET /api/campaigns
   * Returns a paginated, sorted, filtered list of campaigns with insights
   */
  static async getCampaigns(req, res, next) {
    try {
      const user = req.user;
      const {
        page = 1,
        limit = 10,
        search = '',
        status = '',
        sort = 'spend',
        order = 'desc',
        datePreset = 'last_7_days',
        since,
        until
      } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);

      // Generate cache key
      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), 'campaigns/list', {
        page: parsedPage,
        limit: parsedLimit,
        search,
        status,
        sort,
        order,
        datePreset,
        current
      });

      const cached = CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      // Fetch campaigns and insights
      const [campaigns, insights] = await Promise.all([
        CampaignService.getSalesCampaigns(user),
        CampaignController.getCampaignsInsights(user, current)
      ]);

      const insightMap = new Map(insights.map(i => [i.campaign_id, i]));

      // Merge metadata and insights
      let merged = campaigns.map(camp => {
        const ins = insightMap.get(camp.id) || {};
        const spend = parseFloat(ins.spend || 0);
        const reach = parseInt(ins.reach || 0, 10);
        const impressions = parseInt(ins.impressions || 0, 10);
        const clicks = parseInt(ins.clicks || 0, 10);
        const inlineClicks = parseInt(ins.inline_link_clicks || 0, 10);

        const addsToCart = InsightService.getAddToCartActions(ins.actions);
        const checkoutInitiated = InsightService.getInitiateCheckoutActions(ins.actions);
        const purchases = InsightService.getPurchaseActions(ins.actions);
        const purchaseConversionValue = InsightService.getPurchaseActions(ins.action_values);

        const frequency = reach > 0 ? impressions / reach : 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
        const cpc = inlineClicks > 0 ? spend / inlineClicks : (clicks > 0 ? spend / clicks : 0);
        const roas = spend > 0 ? purchaseConversionValue / spend : 0;
        const aov = purchases > 0 ? purchaseConversionValue / purchases : 0;
        const costPerPurchase = purchases > 0 ? spend / purchases : 0;

        return {
          id: camp.id,
          name: camp.name,
          status: camp.status,
          objective: camp.objective,
          dailyBudget: parseFloat(camp.daily_budget || 0) / 100, // Meta API returns in cents/micros typically, but we match dashboard format
          lifetimeBudget: parseFloat(camp.lifetime_budget || 0) / 100,
          budgetRemaining: parseFloat(camp.budget_remaining || 0) / 100,
          spend,
          reach,
          impressions,
          frequency: parseFloat(frequency.toFixed(2)),
          ctr: parseFloat(ctr.toFixed(2)),
          cpm: parseFloat(cpm.toFixed(2)),
          cpc: parseFloat(cpc.toFixed(2)),
          addsToCart,
          checkoutInitiated,
          purchases,
          purchaseConversionValue: parseFloat(purchaseConversionValue.toFixed(2)),
          roas: parseFloat(roas.toFixed(2)),
          aov: parseFloat(aov.toFixed(2)),
          costPerPurchase: parseFloat(costPerPurchase.toFixed(2)),
          lastUpdated: camp.updated_time || new Date().toISOString()
        };
      });

      // Filter
      if (search) {
        const query = search.toLowerCase();
        merged = merged.filter(c => c.name.toLowerCase().includes(query) || c.id.includes(query));
      }
      if (status) {
        merged = merged.filter(c => c.status.toUpperCase() === status.toUpperCase());
      }

      // Sort
      merged.sort((a, b) => {
        let valA = a[sort];
        let valB = b[sort];

        if (typeof valA === 'string') {
          return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        valA = valA || 0;
        valB = valB || 0;
        return order === 'asc' ? valA - valB : valB - valA;
      });

      // Paginate
      const total = merged.length;
      const totalPages = Math.ceil(total / parsedLimit);
      const startIndex = (parsedPage - 1) * parsedLimit;
      const paginated = merged.slice(startIndex, startIndex + parsedLimit);

      const responsePayload = {
        success: true,
        message: 'Campaigns fetched successfully',
        data: paginated,
        errors: {},
        meta: {},
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages
        }
      };

      // Cache result for 2 minutes (120 seconds)
      CacheService.set(cacheKey, responsePayload, 120);

      res.status(200).json(responsePayload);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/export
   * Exports filtered campaigns to CSV format
   */
  static async exportCampaigns(req, res, next) {
    try {
      const user = req.user;
      const {
        search = '',
        status = '',
        sort = 'spend',
        order = 'desc',
        datePreset = 'last_7_days',
        since,
        until
      } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      // Fetch all campaigns and insights
      const [campaigns, insights] = await Promise.all([
        CampaignService.getSalesCampaigns(user),
        CampaignController.getCampaignsInsights(user, current)
      ]);

      const insightMap = new Map(insights.map(i => [i.campaign_id, i]));

      let merged = campaigns.map(camp => {
        const ins = insightMap.get(camp.id) || {};
        const spend = parseFloat(ins.spend || 0);
        const reach = parseInt(ins.reach || 0, 10);
        const impressions = parseInt(ins.impressions || 0, 10);
        const clicks = parseInt(ins.clicks || 0, 10);
        const inlineClicks = parseInt(ins.inline_link_clicks || 0, 10);

        const addsToCart = InsightService.getAddToCartActions(ins.actions);
        const checkoutInitiated = InsightService.getInitiateCheckoutActions(ins.actions);
        const purchases = InsightService.getPurchaseActions(ins.actions);
        const purchaseConversionValue = InsightService.getPurchaseActions(ins.action_values);

        const frequency = reach > 0 ? impressions / reach : 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
        const cpc = inlineClicks > 0 ? spend / inlineClicks : (clicks > 0 ? spend / clicks : 0);
        const roas = spend > 0 ? purchaseConversionValue / spend : 0;
        const aov = purchases > 0 ? purchaseConversionValue / purchases : 0;
        const costPerPurchase = purchases > 0 ? spend / purchases : 0;

        return {
          id: camp.id,
          name: camp.name,
          status: camp.status,
          objective: camp.objective,
          spend,
          reach,
          impressions,
          frequency: parseFloat(frequency.toFixed(2)),
          ctr: parseFloat(ctr.toFixed(2)),
          cpm: parseFloat(cpm.toFixed(2)),
          cpc: parseFloat(cpc.toFixed(2)),
          addsToCart,
          checkoutInitiated,
          purchases,
          purchaseConversionValue: parseFloat(purchaseConversionValue.toFixed(2)),
          roas: parseFloat(roas.toFixed(2)),
          aov: parseFloat(aov.toFixed(2)),
          costPerPurchase: parseFloat(costPerPurchase.toFixed(2)),
          lastUpdated: camp.updated_time || new Date().toISOString()
        };
      });

      // Filter
      if (search) {
        const query = search.toLowerCase();
        merged = merged.filter(c => c.name.toLowerCase().includes(query) || c.id.includes(query));
      }
      if (status) {
        merged = merged.filter(c => c.status.toUpperCase() === status.toUpperCase());
      }

      // Sort
      merged.sort((a, b) => {
        let valA = a[sort];
        let valB = b[sort];

        if (typeof valA === 'string') {
          return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        valA = valA || 0;
        valB = valB || 0;
        return order === 'asc' ? valA - valB : valB - valA;
      });

      // Create CSV content
      const headers = [
        'Campaign ID', 'Campaign Name', 'Status', 'Objective', 'Spend', 'Reach',
        'Impressions', 'Frequency', 'CTR (%)', 'CPM (₹)', 'CPC (₹)', 'Adds To Cart',
        'Checkout Initiated', 'Purchases', 'Revenue (₹)', 'ROAS (x)', 'AOV (₹)',
        'Cost Per Purchase (₹)', 'Last Updated'
      ];

      const rows = merged.map(c => [
        `"${c.id}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        c.status,
        c.objective,
        c.spend,
        c.reach,
        c.impressions,
        c.frequency,
        c.ctr,
        c.cpm,
        c.cpc,
        c.addsToCart,
        c.checkoutInitiated,
        c.purchases,
        c.purchaseConversionValue,
        c.roas,
        c.aov,
        c.costPerPurchase,
        c.lastUpdated
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="campaigns_export.csv"');
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/:campaignId
   * Returns complete campaign detailed analytics organized into standard sections
   */
  static async getCampaignDetails(req, res, next) {
    try {
      const user = req.user;
      const { campaignId } = req.params;
      const { datePreset = 'last_7_days', since, until } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `campaigns/details/${campaignId}`, {
        datePreset,
        current
      });

      const cached = CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      const errors = {};

      // 1. Fetch Metadata
      let campaignMeta = {};
      try {
        campaignMeta = await CampaignService.getCampaignById(user, campaignId);
      } catch (err) {
        errors.campaign = `Failed to load campaign metadata: ${err.message}`;
      }

      // 2. Fetch Overview Insights
      let overview = {};
      try {
        const response = await MetaService.get(`${campaignId}/insights`, user, {
          fields: 'spend,impressions,clicks,inline_link_clicks,reach,frequency,actions,action_values',
          time_range: current
        });
        const ins = response.data?.[0] || {};
        const spend = parseFloat(ins.spend || 0);
        const purchases = InsightService.getPurchaseActions(ins.actions);
        const conversionValue = InsightService.getPurchaseActions(ins.action_values);
        const clicks = parseInt(ins.clicks || 0, 10);
        const impressions = parseInt(ins.impressions || 0, 10);

        overview = {
          spend,
          reach: parseInt(ins.reach || 0, 10),
          impressions,
          purchases,
          revenue: conversionValue,
          roas: spend > 0 ? conversionValue / spend : 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpa: purchases > 0 ? spend / purchases : 0
        };
      } catch (err) {
        errors.overview = `Failed to load overview insights: ${err.message}`;
      }

      // 3. Fetch Daily Trends
      let trends = [];
      try {
        const response = await MetaService.get(`${campaignId}/insights`, user, {
          fields: 'spend,impressions,clicks,actions,action_values,date_start',
          time_increment: 1,
          time_range: current,
          limit: 1000
        });
        const list = response.data || [];
        trends = list.map(day => {
          const spend = parseFloat(day.spend || 0);
          const purchases = InsightService.getPurchaseActions(day.actions);
          const value = InsightService.getPurchaseActions(day.action_values);
          const clicks = parseInt(day.clicks || 0, 10);
          const impressions = parseInt(day.impressions || 0, 10);
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
          return {
            date: day.date_start,
            spend,
            purchases,
            revenue: value,
            ctr: parseFloat(ctr.toFixed(2))
          };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Add 7-day moving averages using AnalyticsService
        trends = AnalyticsService.calculateMovingAverage(trends, 'spend', 7);
        trends = AnalyticsService.calculateMovingAverage(trends, 'purchases', 7);
        trends = AnalyticsService.calculateMovingAverage(trends, 'revenue', 7);
        trends = AnalyticsService.calculateMovingAverage(trends, 'ctr', 7);
      } catch (err) {
        errors.trends = `Failed to load daily trends: ${err.message}`;
      }

      // 4. Fetch Breakdowns
      const breakdowns = { age: [], gender: [], placement: [], device: [], region: [] };

      // Age & Gender
      try {
        const response = await MetaService.get(`${campaignId}/insights`, user, {
          breakdowns: 'age,gender',
          fields: 'spend,impressions,clicks,actions,action_values',
          time_range: current,
          limit: 1000
        });
        const list = response.data || [];
        
        // Populate Age and Gender separately by grouping
        const ageMap = {};
        const genderMap = {};

        list.forEach(item => {
          const age = item.age || 'Unknown';
          const gender = item.gender || 'Unknown';
          const spend = parseFloat(item.spend || 0);
          const clicks = parseInt(item.clicks || 0, 10);
          const impressions = parseInt(item.impressions || 0, 10);
          const purchases = InsightService.getPurchaseActions(item.actions);
          const val = InsightService.getPurchaseActions(item.action_values);

          // Age Group
          if (!ageMap[age]) {
            ageMap[age] = { age, spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
          }
          ageMap[age].spend += spend;
          ageMap[age].impressions += impressions;
          ageMap[age].clicks += clicks;
          ageMap[age].purchases += purchases;
          ageMap[age].revenue += val;

          // Gender Group
          if (!genderMap[gender]) {
            genderMap[gender] = { gender, spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
          }
          genderMap[gender].spend += spend;
          genderMap[gender].impressions += impressions;
          genderMap[gender].clicks += clicks;
          genderMap[gender].purchases += purchases;
          genderMap[gender].revenue += val;
        });

        breakdowns.age = Object.values(ageMap).map(a => ({
          ...a,
          ctr: a.impressions > 0 ? parseFloat(((a.clicks / a.impressions) * 100).toFixed(2)) : 0,
          roas: a.spend > 0 ? parseFloat((a.revenue / a.spend).toFixed(2)) : 0,
          cpa: a.purchases > 0 ? parseFloat((a.spend / a.purchases).toFixed(2)) : 0
        }));

        breakdowns.gender = Object.values(genderMap).map(g => ({
          ...g,
          ctr: g.impressions > 0 ? parseFloat(((g.clicks / g.impressions) * 100).toFixed(2)) : 0,
          roas: g.spend > 0 ? parseFloat((g.revenue / g.spend).toFixed(2)) : 0,
          cpa: g.purchases > 0 ? parseFloat((g.spend / g.purchases).toFixed(2)) : 0
        }));
      } catch (err) {
        errors.demographics = `Failed to load demographics: ${err.message}`;
      }

      // Placement & Device
      try {
        const response = await MetaService.get(`${campaignId}/insights`, user, {
          breakdowns: 'publisher_platform,platform_position,impression_device',
          fields: 'spend,impressions,clicks,actions,action_values',
          time_range: current,
          limit: 1000
        });
        const list = response.data || [];

        const placementMap = {};
        const deviceMap = {};

        list.forEach(item => {
          const platform = item.publisher_platform || 'other';
          const position = item.platform_position || 'other';
          const device = item.impression_device || 'other';

          const spend = parseFloat(item.spend || 0);
          const clicks = parseInt(item.clicks || 0, 10);
          const impressions = parseInt(item.impressions || 0, 10);
          const purchases = InsightService.getPurchaseActions(item.actions);
          const val = InsightService.getPurchaseActions(item.action_values);

          // Classification logic for user-friendly name
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
          }

          if (!placementMap[category]) {
            placementMap[category] = { placement: category, spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
          }
          placementMap[category].spend += spend;
          placementMap[category].impressions += impressions;
          placementMap[category].clicks += clicks;
          placementMap[category].purchases += purchases;
          placementMap[category].revenue += val;

          // Device
          let deviceName = 'Other Devices';
          if (device.includes('iphone') || device.includes('mobile')) deviceName = 'Mobile';
          else if (device.includes('desktop')) deviceName = 'Desktop';
          else if (device.includes('tablet')) deviceName = 'Tablet';

          if (!deviceMap[deviceName]) {
            deviceMap[deviceName] = { device: deviceName, spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
          }
          deviceMap[deviceName].spend += spend;
          deviceMap[deviceName].impressions += impressions;
          deviceMap[deviceName].clicks += clicks;
          deviceMap[deviceName].purchases += purchases;
          deviceMap[deviceName].revenue += val;
        });

        breakdowns.placement = Object.values(placementMap).map(p => ({
          ...p,
          ctr: p.impressions > 0 ? parseFloat(((p.clicks / p.impressions) * 100).toFixed(2)) : 0,
          roas: p.spend > 0 ? parseFloat((p.revenue / p.spend).toFixed(2)) : 0,
          cpa: p.purchases > 0 ? parseFloat((p.spend / p.purchases).toFixed(2)) : 0
        })).sort((a, b) => b.spend - a.spend);

        breakdowns.device = Object.values(deviceMap).map(d => ({
          ...d,
          ctr: d.impressions > 0 ? parseFloat(((d.clicks / d.impressions) * 100).toFixed(2)) : 0,
          roas: d.spend > 0 ? parseFloat((d.revenue / d.spend).toFixed(2)) : 0,
          cpa: d.purchases > 0 ? parseFloat((d.spend / d.purchases).toFixed(2)) : 0
        })).sort((a, b) => b.spend - a.spend);
      } catch (err) {
        errors.placementsDevices = `Failed to load placement/device: ${err.message}`;
      }

      // Region
      try {
        const response = await MetaService.get(`${campaignId}/insights`, user, {
          breakdowns: 'region',
          fields: 'spend,impressions,clicks,actions,action_values',
          time_range: current,
          limit: 1000
        });
        const list = response.data || [];
        breakdowns.region = list.map(item => {
          const spend = parseFloat(item.spend || 0);
          const clicks = parseInt(item.clicks || 0, 10);
          const impressions = parseInt(item.impressions || 0, 10);
          const purchases = InsightService.getPurchaseActions(item.actions);
          const val = InsightService.getPurchaseActions(item.action_values);

          return {
            region: item.region || 'Unknown',
            spend,
            impressions,
            clicks,
            purchases,
            revenue: val,
            ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
            roas: spend > 0 ? parseFloat((val / spend).toFixed(2)) : 0,
            cpa: purchases > 0 ? parseFloat((spend / purchases).toFixed(2)) : 0
          };
        }).sort((a, b) => b.spend - a.spend).slice(0, 10); // top 10 regions
      } catch (err) {
        errors.region = `Failed to load region breakdowns: ${err.message}`;
      }

      // 5. Fetch Campaign Creatives
      let creatives = [];
      try {
        const allSalesCreatives = await CreativeService.getSalesCreatives(user);
        
        // Fetch ad level insights specifically for this campaign
        const adResponse = await MetaService.get(`${campaignId}/insights`, { metaAccountId: user.metaAccountId, accessToken: user.accessToken }, {
          level: 'ad',
          fields: 'ad_id,ad_name,spend,impressions,clicks,actions,action_values',
          time_range: current,
          limit: 1000
        });
        const adInsights = adResponse.data || [];
        const adInsightMap = new Map(adInsights.map(item => [item.ad_id, item]));

        const campaignCreatives = allSalesCreatives.filter(c =>
          c.ads.some(ad => ad.campaignId === campaignId)
        );

        creatives = campaignCreatives.map(c => {
          const campaignAds = c.ads.filter(ad => ad.campaignId === campaignId);
          const campaignAdIds = campaignAds.map(ad => ad.adId);
          const matchingInsights = campaignAdIds.map(id => adInsightMap.get(id)).filter(Boolean);
          const aggregated = InsightService.aggregateInsights(matchingInsights);

          return {
            id: c.id,
            name: c.name,
            isVideo: c.isVideo,
            mediaUrl: c.mediaUrl,
            imageUrl: c.imageUrl,
            thumbnailUrl: c.thumbnailUrl,
            copyText: c.copyText,
            performanceBadge: c.performanceBadge,
            metrics: aggregated
          };
        }).sort((a, b) => b.metrics.spend - a.metrics.spend); // Sort by spend descending
      } catch (err) {
        errors.creatives = `Failed to load creatives: ${err.message}`;
      }

      const responsePayload = {
        success: true,
        message: 'Campaign details fetched successfully',
        data: {
          campaign: {
            id: campaignMeta.id || campaignId,
            name: campaignMeta.name || 'Unknown Campaign',
            status: campaignMeta.status || 'UNKNOWN',
            objective: campaignMeta.objective || 'UNKNOWN',
            startTime: campaignMeta.start_time || null,
            stopTime: campaignMeta.stop_time || null,
            createdTime: campaignMeta.created_time || null,
            updatedTime: campaignMeta.updated_time || null
          },
          overview,
          trends,
          breakdowns,
          creatives,
          adSets: [], // Placeholder for future Ad Sets module
          errors
        },
        errors,
        meta: {}
      };

      // Cache details for 2 minutes (120 seconds)
      CacheService.set(cacheKey, responsePayload, 120);

      res.status(200).json(responsePayload);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Internal helper to fetch campaigns insights at campaign level
   */
  static async getCampaignsInsights(user, timeRange) {
    const accountId = user.metaAccountId;
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const endpoint = `${formattedAccountId}/insights`;

    const params = {
      level: 'campaign',
      fields: 'campaign_id,spend,impressions,clicks,inline_link_clicks,reach,frequency,actions,action_values',
      time_range: timeRange,
      limit: 1000
    };

    const response = await MetaService.get(endpoint, user, params);
    return response.data || [];
  }
}

export default CampaignController;
