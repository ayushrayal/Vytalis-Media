import CreativeService from '../services/creativeService.js';
import InsightService from '../services/insightService.js';
import ClassificationService from '../services/classificationService.js';
import CacheService from '../services/cacheService.js';
import DateHelper from '../utils/dateHelper.js';
import FilterService from '../services/filterService.js';

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
   * Uses lazy enrichment (forceEnrich = false)
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
          CreativeService.getSalesCreatives(user, false), // forceEnrich = false (lazy load)
          InsightService.getAdInsights(user, current)
        ]);

        processed = CreativeController.processCreativesWithInsights(creatives, adInsights);
        CacheService.set(cacheKey, processed, 300); // 5 min list cache (Refinement 3)
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
      error.controller = 'CreativeController';
      error.service = 'CreativeService/InsightService';
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
   * GET /api/creatives/winners
   */
  static async getWinners(req, res, next) {
    req.query.badge = 'Excellent,Great,Good';
    return CreativeController.getCreatives(req, res, next);
  }

  /**
   * GET /api/creatives/poor-performers
   */
  static async getPoorPerformers(req, res, next) {
    req.query.badge = 'Low';
    return CreativeController.getCreatives(req, res, next);
  }

  /**
   * GET /api/creatives/:id
   * Progressive load stage 1: Fetch basic information
   */
  static async getCreativeById(req, res, next) {
    try {
      const { id: creativeId } = req.params;
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;
      const { current } = DateHelper.getRanges(preset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `creatives/detail/basic/${creativeId}`, {
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

      const [creative, metrics] = await Promise.all([
        CreativeService.getCreativeById(user, creativeId),
        CreativeService.getCreativePerformance(user, creativeId, current)
      ]);
      if (!creative) {
        return res.status(404).json({
          success: false,
          errorType: 'NOT_FOUND',
          message: 'Ad creative not found in this account.'
        });
      }

      const periodMetrics = {
        spend: 0,
        purchases: 0,
        roas: 0,
        ...metrics
      };
      const isCarousel = creative.object_story_spec?.carousel_spec || creative.ads.some(ad => ad.adName.toLowerCase().includes('carousel'));
      const category = creative.isVideo
        ? ClassificationService.classifyVideo(creative.name, creative.copyText)
        : ClassificationService.classifyStatic(creative.name, creative.copyText, isCarousel);
      const result = {
        ...creative,
        metrics: periodMetrics,
        category,
        performanceBadge: ClassificationService.getPerformanceBadge(periodMetrics.roas, periodMetrics.spend, periodMetrics.purchases),
        status: creative.ads.some(ad => ad.adStatus === 'ACTIVE') ? 'ACTIVE' : 'PAUSED'
      };

      // Metadata is stable, but creative performance must remain scoped to the selected range.
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
      error.controller = 'CreativeController';
      error.service = 'CreativeService';
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

      const result = await CreativeService.getCreativePerformance(user, creativeId, current);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Ad creative not found.'
        });
      }

      CacheService.set(cacheKey, result, 300); // 5 mins cache for metrics/performance

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
      error.controller = 'CreativeController';
      error.service = 'CreativeService';
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

      const result = await CreativeService.getCreativeTimeline(user, creativeId, current);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Ad creative not found.'
        });
      }

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
      error.controller = 'CreativeController';
      error.service = 'CreativeService';
      next(error);
    }
  }

  /**
   * GET /api/creatives/:id/recommendations
   * Canonical endpoint for AI recommendations
   */
  static async getCreativeRecommendations(req, res, next) {
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

      const result = await CreativeService.getCreativeRecommendations(user, creativeId, current);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Ad creative not found.'
        });
      }

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
      error.controller = 'CreativeController';
      error.service = 'CreativeService';
      next(error);
    }
  }

  /**
   * GET /api/creatives/:id/insights
   * Progressive load stage 4: AI Recommendations (Backwards-compatible delegate)
   */
  static async getCreativeInsights(req, res, next) {
    return CreativeController.getCreativeRecommendations(req, res, next);
  }
}

export default CreativeController;
