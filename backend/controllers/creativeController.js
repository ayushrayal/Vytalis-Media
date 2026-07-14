import CreativeService from '../services/creativeService.js';
import InsightService from '../services/insightService.js';
import ClassificationService from '../services/classificationService.js';
import CacheService from '../services/cacheService.js';
import DateHelper from '../utils/dateHelper.js';
import FilterService from '../services/filterService.js';
import RecommendationService from '../services/recommendationService.js';
import MetaService from '../services/metaService.js';

class CreativeController {
  /**
   * Helper to aggregate insights for a list of creatives
   */
  static processCreativesWithInsights(creatives, adInsights) {
    const insightMap = new Map();
    adInsights.forEach(ins => {
      insightMap.set(ins.ad_id, ins);
    });

    return creatives.map(creative => {
      const creativeInsights = creative.ads
        .map(ad => insightMap.get(ad.adId))
        .filter(Boolean);

      const aggregated = InsightService.aggregateInsights(creativeInsights);

      const isCarousel = creative.object_story_spec?.carousel_spec || creative.ads.some(a => a.adName.toLowerCase().includes('carousel'));
      const category = creative.isVideo
        ? ClassificationService.classifyVideo(creative.name, creative.copyText)
        : ClassificationService.classifyStatic(creative.name, creative.copyText, isCarousel);

      const performanceBadge = ClassificationService.getPerformanceBadge(
        aggregated.roas,
        aggregated.spend,
        aggregated.purchases
      );

      const status = creative.ads.some(a => a.adStatus === 'ACTIVE') ? 'ACTIVE' : 'PAUSED';

      return {
        ...creative,
        metrics: aggregated,
        category,
        performanceBadge,
        status
      };
    });
  }

  /**
   * GET /api/creatives
   * Fetch all creatives with aggregated insights, classifications, and performance badges
   */
  static async getCreatives(req, res, next) {
    try {
      const { preset = 'last_7_days', since, until, search, sort = 'metrics.spend', order = 'desc', page = 1, limit = 12 } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), 'creatives/list', {
        metaAccountId: user.metaAccountId,
        preset,
        current
      });
      
      let processed;
      let isCached = false;
      const cached = CacheService.get(cacheKey);
      
      if (cached) {
        processed = cached;
        isCached = true;
      } else {
        const [creatives, adInsights] = await Promise.all([
          CreativeService.getSalesCreatives(user),
          InsightService.getAdInsights(user, current)
        ]);

        processed = CreativeController.processCreativesWithInsights(creatives, adInsights);
        CacheService.set(cacheKey, processed, 300);
      }

      // Apply Search
      let filtered = processed;
      if (search) {
        filtered = FilterService.applySearch(filtered, search, [
          'name',
          'productName',
          'headline',
          'copyText',
          'id'
        ]);
      }

      // Apply dynamic multi-filters
      filtered = FilterService.applyCreativeFilters(filtered, req.query);

      // Apply Sorting
      filtered = FilterService.applySorting(filtered, sort, order);

      // Apply Pagination
      const paginatedResult = FilterService.applyPagination(filtered, page, limit);

      res.status(200).json({
        success: true,
        message: 'Creatives list retrieved successfully',
        data: paginatedResult.data,
        pagination: paginatedResult.pagination,
        meta: {
          generatedAt: new Date().toISOString(),
          cache: isCached,
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
   * GET /api/creatives/videos
   */
  static async getVideos(req, res, next) {
    req.query.creativeType = 'video';
    return CreativeController.getCreatives(req, res, next);
  }

  /**
   * GET /api/creatives/statics
   */
  static async getStatics(req, res, next) {
    req.query.creativeType = 'static';
    return CreativeController.getCreatives(req, res, next);
  }

  /**
   * GET /api/creatives/:id
   * Progressive load stage 1: Fetch basic information
   */
  static async getCreativeById(req, res, next) {
    try {
      const { id: creativeId } = req.params;
      const user = req.user;

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `creatives/detail/basic/${creativeId}`, {
        metaAccountId: user.metaAccountId
      });
      const cached = CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          meta: { generatedAt: new Date().toISOString(), cache: true }
        });
      }

      const creatives = await CreativeService.getSalesCreatives(user);
      const creative = creatives.find(c => c.id === creativeId);

      if (!creative) {
        return res.status(404).json({
          success: false,
          errorType: 'NOT_FOUND',
          message: 'Ad creative not found in this account.'
        });
      }

      // Run enrich to populate headline, cta, landingPage, productName, createdDate
      const enriched = await CreativeService.enrichCreativeAssets([creative], user);
      const result = enriched[0];

      CacheService.set(cacheKey, result, 600); // basic info changes rarely, cache longer

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          generatedAt: new Date().toISOString(),
          cache: false
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/creatives/:id/performance
   * Progressive load stage 2: Fetch performance summary
   */
  static async getCreativePerformance(req, res, next) {
    try {
      const { id: creativeId } = req.params;
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `creatives/detail/perf/${creativeId}`, {
        metaAccountId: user.metaAccountId,
        preset,
        current
      });

      const cached = CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          meta: { generatedAt: new Date().toISOString(), cache: true, dateRange: current }
        });
      }

      const creatives = await CreativeService.getSalesCreatives(user);
      const creative = creatives.find(c => c.id === creativeId);

      if (!creative) {
        return res.status(404).json({
          success: false,
          message: 'Ad creative not found.'
        });
      }

      const adInsights = await InsightService.getAdInsights(user, current);
      const processed = CreativeController.processCreativesWithInsights([creative], adInsights);
      const result = processed[0].metrics;

      CacheService.set(cacheKey, result, 300);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          generatedAt: new Date().toISOString(),
          cache: false,
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/creatives/:id/timeline
   * Progressive load stage 3: Fetch historical daily trends
   */
  static async getCreativeTimeline(req, res, next) {
    try {
      const { id: creativeId } = req.params;
      const { preset = 'last_30_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `creatives/detail/timeline/${creativeId}`, {
        metaAccountId: user.metaAccountId,
        preset,
        current
      });

      const cached = CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          meta: { generatedAt: new Date().toISOString(), cache: true, dateRange: current }
        });
      }

      const creatives = await CreativeService.getSalesCreatives(user);
      const creative = creatives.find(c => c.id === creativeId);

      if (!creative) {
        return res.status(404).json({
          success: false,
          message: 'Ad creative not found.'
        });
      }

      const adIds = creative.ads?.map(ad => ad.adId) || [];
      if (adIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          meta: { generatedAt: new Date().toISOString(), cache: false, dateRange: current }
        });
      }

      const accountId = user.metaAccountId;
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
      
      const response = await MetaService.get(`${formattedAccountId}/insights`, user, {
        level: 'ad',
        time_increment: 1,
        fields: 'ad_id,spend,impressions,clicks,actions,action_values,date_start',
        filtering: [{ field: 'ad.id', operator: 'IN', value: adIds }],
        time_range: current,
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
      const enrichedTimeline = timeline.map(day => {
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

      CacheService.set(cacheKey, enrichedTimeline, 300);

      res.status(200).json({
        success: true,
        data: enrichedTimeline,
        meta: {
          generatedAt: new Date().toISOString(),
          cache: false,
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/creatives/:id/insights
   * Progressive load stage 4: AI Recommendations
   */
  static async getCreativeInsights(req, res, next) {
    try {
      const { id: creativeId } = req.params;
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `creatives/detail/insights/${creativeId}`, {
        metaAccountId: user.metaAccountId,
        preset,
        current
      });

      const cached = CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          meta: { generatedAt: new Date().toISOString(), cache: true, dateRange: current }
        });
      }

      const creatives = await CreativeService.getSalesCreatives(user);
      const creative = creatives.find(c => c.id === creativeId);

      if (!creative) {
        return res.status(404).json({
          success: false,
          message: 'Ad creative not found.'
        });
      }

      const adInsights = await InsightService.getAdInsights(user, current);
      const processed = CreativeController.processCreativesWithInsights([creative], adInsights);
      
      const enrichedCreative = processed[0];
      const insights = RecommendationService.generateCreativeRecommendations(
        enrichedCreative.metrics,
        enrichedCreative
      );

      CacheService.set(cacheKey, insights, 300);

      res.status(200).json({
        success: true,
        data: insights,
        meta: {
          generatedAt: new Date().toISOString(),
          cache: false,
          dateRange: current
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CreativeController;
