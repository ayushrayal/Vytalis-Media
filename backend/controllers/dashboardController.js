import DashboardService from '../services/dashboardService.js';
import ChartService from '../services/chartService.js';
import BreakdownService from '../services/breakdownService.js';
import CacheService from '../services/cacheService.js';
import DateHelper from '../utils/dateHelper.js';

class DashboardController {
  /**
   * GET /api/dashboard/overview
   * Returns overview KPI summary & comparison cards
   */
  /**
   * GET /api/dashboard/overview
   * Returns overview KPI summary & comparison cards
   */
  static async getOverview(req, res, next) {
    const startTime = Date.now();
    const endpoint = req.originalUrl || '/api/dashboard/overview';
    try {
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;

      const customRange = since && until ? { since, until } : null;
      
      const data = await DashboardService.getOverview(
        user,
        preset,
        customRange
      );

      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'completed',
        httpStatus: 200
      });

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'failed',
        errorType: error.errorType || 'META_API_ERROR',
        httpStatus: error.status || 503
      });
      next(error);
    }
  }

  /**
   * GET /api/dashboard/trends
   * Returns daily trends for timeline plots
   */
  static async getTrends(req, res, next) {
    const startTime = Date.now();
    const endpoint = req.originalUrl || '/api/dashboard/trends';
    try {
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);
      
      // Cache check
      const cacheKey = CacheService.generateKey(user?.id || user?._id?.toString(), 'dashboard/trends', {
        metaAccountId: user?.metaAccountId,
        preset,
        current
      });
      const cached = CacheService.get(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        console.log({
          endpoint,
          duration: `${duration}ms`,
          status: 'completed (cached)',
          httpStatus: 200
        });
        return res.status(200).json({ success: true, data: cached });
      }

      const trendData = await ChartService.getDailyTrends(
        user,
        current
      );

      CacheService.set(cacheKey, trendData, 300);

      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'completed',
        httpStatus: 200
      });

      res.status(200).json({
        success: true,
        data: trendData
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'failed',
        errorType: error.errorType || 'META_API_ERROR',
        httpStatus: error.status || 503
      });
      next(error);
    }
  }

  /**
   * GET /api/dashboard/charts
   * Similar to trends or customized chart dimensions.
   */
  static async getCharts(req, res, next) {
    return DashboardController.getTrends(req, res, next);
  }

  /**
   * GET /api/dashboard/comparison
   * Compares current 7 days with previous 7 days (as requested)
   */
  static async getComparison(req, res, next) {
    const startTime = Date.now();
    const endpoint = req.originalUrl || '/api/dashboard/comparison';
    try {
      const user = req.user;
      
      // Specifically fetch last 7 days overview
      const data = await DashboardService.getOverview(
        user,
        'last_7_days'
      );

      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'completed',
        httpStatus: 200
      });

      res.status(200).json({
        success: true,
        data: {
          period: '7_days',
          kpis: data.kpis
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'failed',
        errorType: error.errorType || 'META_API_ERROR',
        httpStatus: error.status || 503
      });
      next(error);
    }
  }

  /**
   * GET /api/dashboard/breakdowns
   * Returns both Age and Placement breakdowns for the current period
   */
  static async getBreakdowns(req, res, next) {
    const startTime = Date.now();
    const endpoint = req.originalUrl || '/api/dashboard/breakdowns';
    try {
      const { preset = 'last_7_days', since, until } = req.query;
      const user = req.user;
      const customRange = since && until ? { since, until } : null;

      const { current } = DateHelper.getRanges(preset, customRange);

      const cacheKey = CacheService.generateKey(user?.id || user?._id?.toString(), 'dashboard/breakdowns', {
        metaAccountId: user?.metaAccountId,
        preset,
        current
      });
      const cached = CacheService.get(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        console.log({
          endpoint,
          duration: `${duration}ms`,
          status: 'completed (cached)',
          httpStatus: 200
        });
        return res.status(200).json({ success: true, data: cached });
      }

      // Fetch age and placement in parallel
      const [ageBreakdown, placementBreakdown] = await Promise.all([
        BreakdownService.getAgeBreakdown(user, current),
        BreakdownService.getPlacementBreakdown(user, current)
      ]);

      const result = {
        age: ageBreakdown,
        placement: placementBreakdown
      };

      CacheService.set(cacheKey, result, 300);

      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'completed',
        httpStatus: 200
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log({
        endpoint,
        duration: `${duration}ms`,
        status: 'failed',
        errorType: error.errorType || 'META_API_ERROR',
        httpStatus: error.status || 503
      });
      next(error);
    }
  }
}

export default DashboardController;
