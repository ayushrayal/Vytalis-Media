import CampaignService from '../services/campaignService.js';
import InsightService from '../services/insightService.js';
import CreativeService from '../services/creativeService.js';
import AnalyticsService from '../services/analyticsService.js';
import CacheService from '../services/cacheService.js';
import MetaService from '../services/metaService.js';
import DateHelper from '../utils/dateHelper.js';
import FilterService from '../services/filterService.js';
import RecommendationService from '../services/recommendationService.js';

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
        datePreset,
        current
      });

      const merged = await CacheService.getOrFetch(cacheKey, async () => {
        // Fetch campaigns and insights
        const [campaigns, insights] = await Promise.all([
          CampaignService.getSalesCampaigns(user),
          CampaignController.getCampaignsInsights(user, current)
        ]);

        const insightMap = new Map(insights.map(i => [i.campaign_id, i]));

        // Merge metadata and insights
        return campaigns.map(camp => {
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
            dailyBudget: parseFloat(camp.daily_budget || 0) / 100,
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
      }, 'campaigns'); // Cache for 5 minutes (from cacheConfig.js)

      // Apply Search
      let filtered = merged;
      if (search) {
        filtered = FilterService.applySearch(filtered, search, ['name', 'id']);
      }

      // Apply Status Filter
      if (status) {
        filtered = filtered.filter(c => c.status.toUpperCase() === status.toUpperCase());
      }

      // Apply Sorting
      filtered = FilterService.applySorting(filtered, sort, order);

      // Apply Pagination
      const paginatedResult = FilterService.applyPagination(filtered, parsedPage, parsedLimit);

      // Append warnings if any warnings exist in the raw response
      const warnings = merged._warnings || [];

      res.status(200).json({
        success: true,
        message: 'Campaigns fetched successfully',
        data: paginatedResult.data,
        pagination: paginatedResult.pagination,
        warnings,
        meta: {
          generatedAt: new Date().toISOString(),
          cache: true,
          dateRange: {
            since: current.since,
            until: current.until
          }
        }
      });
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
      let filtered = merged;
      if (search) {
        filtered = FilterService.applySearch(merged, search, ['name', 'id']);
      }
      if (status) {
        filtered = filtered.filter(c => c.status.toUpperCase() === status.toUpperCase());
      }

      // Sort
      filtered = FilterService.applySorting(filtered, sort, order);

      // Create CSV content
      const headers = [
        'Campaign ID', 'Campaign Name', 'Status', 'Objective', 'Spend', 'Reach',
        'Impressions', 'Frequency', 'CTR (%)', 'CPM (₹)', 'CPC (₹)', 'Adds To Cart',
        'Checkout Initiated', 'Purchases', 'Revenue (₹)', 'ROAS (x)', 'AOV (₹)',
        'Cost Per Purchase (₹)', 'Last Updated'
      ];

      const rows = filtered.map(c => [
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
   * Returns metadata and overview KPIs for lazy/progressive drawer loading
   */
  static async getCampaignDetails(req, res, next) {
    try {
      const user = req.user;
      const { campaignId } = req.params;
      const { datePreset = 'last_7_days', since, until } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `campaigns/details/basic/${campaignId}`, {
        datePreset,
        current
      });

      const result = await CacheService.getOrFetch(cacheKey, async () => {
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
          }, { resourceType: 'campaign' });
          
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

        // Calculate average daily spend directly from date range
        const days = Math.round((new Date(current.until) - new Date(current.since)) / (1000 * 60 * 60 * 24)) + 1;
        const averageDailySpend = days > 0 ? ((overview.spend || 0) / days) : 0;

        return {
          success: true,
          message: 'Campaign details fetched successfully',
          data: {
            campaign: {
              id: campaignMeta.id || campaignId,
              name: campaignMeta.name || 'Unknown Campaign',
              status: campaignMeta.status || 'UNKNOWN',
              objective: campaignMeta.objective || 'UNKNOWN',
              dailyBudget: parseFloat(campaignMeta.daily_budget || 0) / 100,
              lifetimeBudget: parseFloat(campaignMeta.lifetime_budget || 0) / 100,
              budgetRemaining: parseFloat(campaignMeta.budget_remaining || 0) / 100,
              buyingType: campaignMeta.buying_type || 'AUCTION',
              startTime: campaignMeta.start_time || null,
              stopTime: campaignMeta.stop_time || null,
              createdTime: campaignMeta.created_time || null,
              updatedTime: campaignMeta.updated_time || null
            },
            overview,
            summary: {
              bestPlacement: 'Pending...',
              bestDevice: 'Pending...',
              bestAudience: 'Pending...',
              bestCreative: { name: 'Pending...', id: '' },
              worstCreative: { name: 'Pending...', id: '' },
              averageDailySpend
            },
            errors
          }
        };
      }, 'campaignDetails');

      const warnings = result._warnings || [];

      res.status(200).json({
        ...result,
        warnings,
        meta: {
          generatedAt: new Date().toISOString(),
          cache: true,
          dateRange: {
            since: current.since,
            until: current.until
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/:campaignId/trends
   * Progressive load sub-endpoint: Daily historical trends
   */
  static async getCampaignTrends(req, res, next) {
    try {
      const user = req.user;
      const { campaignId } = req.params;
      const { datePreset = 'last_7_days', since, until } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `campaigns/details/trends/${campaignId}`, {
        datePreset,
        current
      });

      const result = await CacheService.getOrFetch(cacheKey, async () => {
        let trends = [];
        try {
          const response = await MetaService.get(`${campaignId}/insights`, user, {
            fields: 'spend,impressions,clicks,actions,action_values,date_start',
            time_increment: 1,
            time_range: current,
            limit: 1000
          }, { resourceType: 'campaign' });
          
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

          trends = AnalyticsService.calculateMovingAverage(trends, 'spend', 7);
          trends = AnalyticsService.calculateMovingAverage(trends, 'purchases', 7);
          trends = AnalyticsService.calculateMovingAverage(trends, 'revenue', 7);
          trends = AnalyticsService.calculateMovingAverage(trends, 'ctr', 7);
        } catch (err) {
          throw new Error(`Failed to load daily trends: ${err.message}`);
        }

        return { success: true, data: trends };
      }, 'campaignDetails');

      const warnings = result._warnings || [];

      res.status(200).json({
        ...result,
        warnings,
        meta: {
          generatedAt: new Date().toISOString(),
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/:campaignId/creatives
   * Progressive load sub-endpoint: Campaign creatives list
   */
  static async getCampaignCreatives(req, res, next) {
    try {
      const user = req.user;
      const { campaignId } = req.params;
      const { datePreset = 'last_7_days', since, until } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `campaigns/details/creatives/${campaignId}`, {
        datePreset,
        current
      });

      const result = await CacheService.getOrFetch(cacheKey, async () => {
        let creatives = [];
        try {
          const allSalesCreatives = await CreativeService.getSalesCreatives(user);
          
          const adResponse = await MetaService.get(`${campaignId}/insights`, user, {
            level: 'ad',
            fields: 'ad_id,ad_name,spend,impressions,clicks,actions,action_values',
            time_range: current,
            limit: 1000
          }, { resourceType: 'ad' });
          
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
          }).sort((a, b) => b.metrics.spend - a.metrics.spend);
        } catch (err) {
          throw new Error(`Failed to load creatives: ${err.message}`);
        }

        return { success: true, data: creatives };
      }, 'campaignDetails');

      const warnings = result._warnings || [];

      res.status(200).json({
        ...result,
        warnings,
        meta: {
          generatedAt: new Date().toISOString(),
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/:campaignId/breakdowns
   * Progressive load sub-endpoint: Demographic, Placement, Device, Region breakdowns
   */
  static async getCampaignBreakdowns(req, res, next) {
    try {
      const user = req.user;
      const { campaignId } = req.params;
      const { datePreset = 'last_7_days', since, until } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `campaigns/details/breakdowns/${campaignId}`, {
        datePreset,
        current
      });

      const result = await CacheService.getOrFetch(cacheKey, async () => {
        const breakdowns = { age: [], gender: [], placement: [], device: [], region: [] };
        const errors = {};

        // Demographics
        try {
          const response = await MetaService.get(`${campaignId}/insights`, user, {
            breakdowns: 'age,gender',
            fields: 'spend,impressions,clicks,actions,action_values',
            time_range: current,
            limit: 1000
          }, { resourceType: 'campaign' });
          
          const list = response.data || [];
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

            if (!ageMap[age]) {
              ageMap[age] = { age, spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
            }
            ageMap[age].spend += spend;
            ageMap[age].impressions += impressions;
            ageMap[age].clicks += clicks;
            ageMap[age].purchases += purchases;
            ageMap[age].revenue += val;

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
          }, { resourceType: 'campaign' });
          
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
          }, { resourceType: 'campaign' });
          
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
          }).sort((a, b) => b.spend - a.spend).slice(0, 10);
        } catch (err) {
          errors.region = `Failed to load region breakdowns: ${err.message}`;
        }

        return { success: true, data: breakdowns, errors };
      }, 'breakdowns');

      const warnings = result._warnings || [];

      res.status(200).json({
        ...result,
        warnings,
        meta: {
          generatedAt: new Date().toISOString(),
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/:campaignId/adsets
   * Progressive load sub-endpoint: Campaign ad sets listing
   */
  static async getCampaignAdSets(req, res, next) {
    try {
      const user = req.user;
      const { campaignId } = req.params;
      const { datePreset = 'last_7_days', since, until } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `campaigns/details/adsets/${campaignId}`, {
        datePreset,
        current
      });

      const result = await CacheService.getOrFetch(cacheKey, async () => {
        let adSets = [];
        try {
          const [adSetResponse, adSetDemoResponse, adSetPlaceResponse] = await Promise.all([
            MetaService.get(`${campaignId}/insights`, user, {
              level: 'adset',
              fields: 'adset_id,adset_name,spend,impressions,clicks,actions,action_values',
              time_range: current,
              limit: 1000
            }, { resourceType: 'campaign' }),
            MetaService.get(`${campaignId}/insights`, user, {
              level: 'adset',
              breakdowns: 'age,gender',
              fields: 'adset_id,spend,impressions,clicks,actions,action_values',
              time_range: current,
              limit: 1000
            }, { resourceType: 'campaign' }),
            MetaService.get(`${campaignId}/insights`, user, {
              level: 'adset',
              breakdowns: 'publisher_platform,platform_position',
              fields: 'adset_id,spend,impressions,clicks,actions,action_values',
              time_range: current,
              limit: 1000
            }, { resourceType: 'campaign' })
          ]);

          const basicList = adSetResponse.data || [];
          const demoList = adSetDemoResponse.data || [];
          const placeList = adSetPlaceResponse.data || [];

          adSets = basicList.map(item => {
            const adsetId = item.adset_id;
            const spend = parseFloat(item.spend || 0);
            const purchases = InsightService.getPurchaseActions(item.actions);
            const revenue = InsightService.getPurchaseActions(item.action_values);
            const clicks = parseInt(item.clicks || 0, 10);
            const impressions = parseInt(item.impressions || 0, 10);

            const myDemos = demoList.filter(d => d.adset_id === adsetId);
            const ageGroups = {};
            const genderGroups = {};
            myDemos.forEach(d => {
              const age = d.age || 'Unknown';
              const gender = d.gender || 'Unknown';
              const dSpend = parseFloat(d.spend || 0);
              const dPurchases = InsightService.getPurchaseActions(d.actions);
              const dRevenue = InsightService.getPurchaseActions(d.action_values);

              if (!ageGroups[age]) ageGroups[age] = { age, spend: 0, purchases: 0, revenue: 0 };
              ageGroups[age].spend += dSpend;
              ageGroups[age].purchases += dPurchases;
              ageGroups[age].revenue += dRevenue;

              if (!genderGroups[gender]) genderGroups[gender] = { gender, spend: 0, purchases: 0, revenue: 0 };
              genderGroups[gender].spend += dSpend;
              genderGroups[gender].purchases += dPurchases;
              genderGroups[gender].revenue += dRevenue;
            });

            const myPlacements = placeList.filter(p => p.adset_id === adsetId);
            const placementGroups = {};
            myPlacements.forEach(p => {
              const platform = p.publisher_platform || 'other';
              const position = p.platform_position || 'other';
              const pSpend = parseFloat(p.spend || 0);
              const pPurchases = InsightService.getPurchaseActions(p.actions);
              const pRevenue = InsightService.getPurchaseActions(p.action_values);

              let label = `${platform} ${position}`.replace(/_/g, ' ');
              if (!placementGroups[label]) placementGroups[label] = { placement: label, spend: 0, purchases: 0, revenue: 0 };
              placementGroups[label].spend += pSpend;
              placementGroups[label].purchases += pPurchases;
              placementGroups[label].revenue += pRevenue;
            });

            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpa = purchases > 0 ? spend / purchases : 0;
            const roas = spend > 0 ? revenue / spend : 0;

            return {
              id: adsetId,
              name: item.adset_name,
              audience: 'Core Targeting Stack',
              spend,
              purchases,
              revenue,
              ctr: parseFloat(ctr.toFixed(2)),
              cpa: parseFloat(cpa.toFixed(2)),
              roas: parseFloat(roas.toFixed(2)),
              ageBreakdown: Object.values(ageGroups),
              genderBreakdown: Object.values(genderGroups),
              placementBreakdown: Object.values(placementGroups)
            };
          }).sort((a, b) => b.spend - a.spend);
        } catch (err) {
          throw new Error(`Failed to load ad sets: ${err.message}`);
        }

        return { success: true, data: adSets };
      }, 'campaignDetails');

      const warnings = result._warnings || [];

      res.status(200).json({
        ...result,
        warnings,
        meta: {
          generatedAt: new Date().toISOString(),
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/:campaignId/recommendations
   * Progressive load sub-endpoint: AI Recommendations
   */
  static async getCampaignRecommendations(req, res, next) {
    try {
      const user = req.user;
      const { campaignId } = req.params;
      const { datePreset = 'last_7_days', since, until } = req.query;

      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(datePreset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `campaigns/details/recommendations/${campaignId}`, {
        datePreset,
        current
      });

      const result = await CacheService.getOrFetch(cacheKey, async () => {
        let recommendations = [];
        try {
          const [campaignMeta, overviewResponse, adSetsResponse, trendsResponse] = await Promise.all([
            CampaignService.getCampaignById(user, campaignId),
            MetaService.get(`${campaignId}/insights`, user, {
              fields: 'spend,impressions,clicks,inline_link_clicks,reach,frequency,actions,action_values',
              time_range: current
            }, { resourceType: 'campaign' }),
            MetaService.get(`${campaignId}/insights`, user, {
              level: 'adset',
              fields: 'adset_id,adset_name,spend,impressions,clicks,actions,action_values',
              time_range: current,
              limit: 1000
            }, { resourceType: 'campaign' }),
            MetaService.get(`${campaignId}/insights`, user, {
              fields: 'spend,impressions,clicks,actions,action_values,date_start',
              time_increment: 1,
              time_range: current,
              limit: 1000
            }, { resourceType: 'campaign' })
          ]);

          const ins = overviewResponse.data?.[0] || {};
          const spend = parseFloat(ins.spend || 0);
          const purchases = InsightService.getPurchaseActions(ins.actions);
          const conversionValue = InsightService.getPurchaseActions(ins.action_values);
          const clicks = parseInt(ins.clicks || 0, 10);
          const impressions = parseInt(ins.impressions || 0, 10);

          const overview = {
            spend,
            reach: parseInt(ins.reach || 0, 10),
            impressions,
            purchases,
            revenue: conversionValue,
            roas: spend > 0 ? conversionValue / spend : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpa: purchases > 0 ? spend / purchases : 0
          };

          const trends = (trendsResponse.data || []).map(day => {
            const dSpend = parseFloat(day.spend || 0);
            const dPurchases = InsightService.getPurchaseActions(day.actions);
            const dValue = InsightService.getPurchaseActions(day.action_values);
            const dClicks = parseInt(day.clicks || 0, 10);
            const dImpressions = parseInt(day.impressions || 0, 10);
            const ctr = dImpressions > 0 ? (dClicks / dImpressions) * 100 : 0;
            return {
              date: day.date_start,
              spend: dSpend,
              purchases: dPurchases,
              revenue: dValue,
              ctr: parseFloat(ctr.toFixed(2))
            };
          }).sort((a, b) => new Date(a.date) - new Date(b.date));

          const adSets = (adSetsResponse.data || []).map(item => {
            const adsetId = item.adset_id;
            const aSpend = parseFloat(item.spend || 0);
            const aPurchases = InsightService.getPurchaseActions(item.actions);
            const aRevenue = InsightService.getPurchaseActions(item.action_values);

            return {
              id: adsetId,
              name: item.adset_name,
              spend: aSpend,
              purchases: aPurchases,
              revenue: aRevenue,
              ctr: 0,
              cpa: aPurchases > 0 ? aSpend / aPurchases : 0,
              roas: aSpend > 0 ? aRevenue / aSpend : 0
            };
          });

          recommendations = RecommendationService.generateCampaignRecommendations(overview, campaignMeta, trends, adSets);
        } catch (err) {
          throw new Error(`Failed to generate recommendations: ${err.message}`);
        }

        return { success: true, data: recommendations };
      }, 'campaignDetails');

      const warnings = result._warnings || [];

      res.status(200).json({
        ...result,
        warnings,
        meta: {
          generatedAt: new Date().toISOString(),
          dateRange: current
        }
      });
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

    const response = await MetaService.get(endpoint, user, params, { resourceType: 'campaign' });
    return response.data || [];
  }
}

export default CampaignController;
