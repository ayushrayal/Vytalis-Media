import CreativeService from '../services/creativeService.js';
import InsightService from '../services/insightService.js';
import ClassificationService from '../services/classificationService.js';
import CacheService from '../services/cacheService.js';
import DateHelper from '../utils/dateHelper.js';

class CreativeController {
  /**
   * Helper to aggregate insights for a list of creatives
   */
  static processCreativesWithInsights(creatives, adInsights) {
    // Index ad insights by ad_id for fast lookup
    const insightMap = new Map();
    adInsights.forEach(ins => {
      insightMap.set(ins.ad_id, ins);
    });

    return creatives.map(creative => {
      // Find all insights for ads that use this creative
      const creativeInsights = creative.ads
        .map(ad => insightMap.get(ad.adId))
        .filter(Boolean);

      // Aggregate these insights
      const aggregated = InsightService.aggregateInsights(creativeInsights);

      // Classify the creative
      const isCarousel = creative.object_story_spec?.carousel_spec || creative.ads.some(a => a.adName.toLowerCase().includes('carousel'));
      const category = creative.isVideo
        ? ClassificationService.classifyVideo(creative.name, creative.copyText)
        : ClassificationService.classifyStatic(creative.name, creative.copyText, isCarousel);

      const performanceBadge = ClassificationService.getPerformanceBadge(
        aggregated.roas,
        aggregated.spend,
        aggregated.purchases
      );

      // Identify status (ACTIVE if any running ad is ACTIVE)
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
   * Helper to filter creatives by global search and multi-filters
   */
  static applyFilters(creatives, query) {
    const {
      search,
      campaignId,
      adsetId,
      status,
      badge,
      category,
      creativeType
    } = query;

    let filtered = [...creatives];

    // 1. Global Search: campaign name, adset name, ad name, creative name
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c => {
        const matchesCreative = c.name.toLowerCase().includes(searchLower) || c.copyText?.toLowerCase().includes(searchLower);
        const matchesAds = c.ads.some(ad => 
          ad.adName.toLowerCase().includes(searchLower) ||
          ad.campaignName.toLowerCase().includes(searchLower) ||
          ad.adsetName.toLowerCase().includes(searchLower)
        );
        return matchesCreative || matchesAds;
      });
    }

    // 2. Campaign Filter
    if (campaignId) {
      filtered = filtered.filter(c => c.ads.some(ad => ad.campaignId === campaignId));
    }

    // 3. Ad Set Filter
    if (adsetId) {
      filtered = filtered.filter(c => c.ads.some(ad => ad.adsetId === adsetId));
    }

    // 4. Status Filter
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    // 5. Performance Badge Filter
    if (badge) {
      filtered = filtered.filter(c => c.performanceBadge === badge);
    }

    // 6. Category Filter
    if (category) {
      filtered = filtered.filter(c => c.category === category);
    }

    // 7. Creative Type Filter
    if (creativeType) {
      if (creativeType === 'video') {
        filtered = filtered.filter(c => c.isVideo);
      } else if (creativeType === 'static') {
        filtered = filtered.filter(c => !c.isVideo);
      }
    }

    return filtered;
  }

  /**
   * GET /api/creatives
   * Fetch all creatives with aggregated insights, classifications, and performance badges
   */
  static async getCreatives(req, res, next) {
    try {
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);

      // Cache check
      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), 'creatives/list', {
        metaAccountId: user.metaAccountId,
        preset,
        current
      });
      const cached = CacheService.get(cacheKey);
      
      let processed;
      if (cached) {
        processed = cached;
      } else {
        // Fetch creatives and insights parallelly passing the user object
        const [creatives, adInsights] = await Promise.all([
          CreativeService.getSalesCreatives(user),
          InsightService.getAdInsights(user, current)
        ]);

        processed = CreativeController.processCreativesWithInsights(creatives, adInsights);
        CacheService.set(cacheKey, processed, 300);
      }

      // Apply search and filter params in-memory (allows fast frontend filtering)
      const filtered = CreativeController.applyFilters(processed, req.query);

      res.status(200).json({
        success: true,
        count: filtered.length,
        data: filtered
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/creatives/videos
   * Filter and return video creatives only
   */
  static async getVideos(req, res, next) {
    req.query.creativeType = 'video';
    return CreativeController.getCreatives(req, res, next);
  }

  /**
   * GET /api/creatives/statics
   * Filter and return static creatives only
   */
  static async getStatics(req, res, next) {
    req.query.creativeType = 'static';
    return CreativeController.getCreatives(req, res, next);
  }

  /**
   * GET /api/creatives/:id
   * Fetch a single creative's details and detailed insights
   */
  static async getCreativeById(req, res, next) {
    try {
      const { id: creativeId } = req.params;
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);

      const cacheKey = CacheService.generateKey(user.id || user._id?.toString(), `creatives/detail/${creativeId}`, {
        metaAccountId: user.metaAccountId,
        preset,
        current
      });
      const cached = CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json({ success: true, data: cached });
      }

      // Fetch all creatives and find the requested one
      const creatives = await CreativeService.getSalesCreatives(user);
      const creative = creatives.find(c => c.id === creativeId);

      if (!creative) {
        return res.status(404).json({
          success: false,
          errorType: 'NOT_FOUND',
          message: 'Ad creative not found in this account.'
        });
      }

      // Fetch insights for this creative's ads
      const adInsights = await InsightService.getAdInsights(user, current);
      const processedList = CreativeController.processCreativesWithInsights([creative], adInsights);
      const result = processedList[0];

      CacheService.set(cacheKey, result, 300);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CreativeController;
