import CampaignService from './campaignService.js';
import InsightService from './insightService.js';
import ComparisonService from './comparisonService.js';
import DateHelper from '../utils/dateHelper.js';
import CacheService from './cacheService.js';
import BrandService from './brandService.js';

class DashboardService {
  /**
   * Compose the main dashboard overview KPIs, campaigns count, and period comparisons
   */
  static async getOverview(user, datePreset, customRange = null) {
    const accountId = user.metaAccountId;
    const userId = user.id || user._id?.toString();

    // 1. Resolve date ranges
    const { current, previous } = DateHelper.getRanges(datePreset, customRange);
    
    // Check cache
    const cacheKey = CacheService.generateKey(userId, 'dashboard/overview', {
      accountId,
      datePreset,
      current,
      previous
    });
    
    const cachedData = CacheService.get(cacheKey);
    if (cachedData) {
      const { brandName } = await BrandService.getBrandName(user);
      cachedData.brandName = brandName;
      console.log(`[Cache] Serving Dashboard Overview from cache for key: ${cacheKey}`);
      return cachedData;
    }

    console.log(`[API] Fetching Dashboard Overview from Meta API for current: ${JSON.stringify(current)}, previous: ${JSON.stringify(previous)}`);

    // 2. Fetch campaign list, insights, and resolved brand name in parallel
    const [{ brandName }, campaigns, currentInsights, previousInsights] = await Promise.all([
      BrandService.getBrandName(user),
      CampaignService.getSalesCampaigns(user),
      InsightService.getAccountAggregatedInsights(user, current),
      InsightService.getAccountAggregatedInsights(user, previous)
    ]);

    // 3. Aggregate current and previous insights
    const currentAgg = InsightService.aggregateInsights(currentInsights);
    const previousAgg = InsightService.aggregateInsights(previousInsights);

    // 4. Compute comparisons
    const comparisons = ComparisonService.compareInsights(currentAgg, previousAgg);

    // 5. Gather campaign info
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
    
    const result = {
      brandName,
      dateRange: current,
      previousDateRange: previous,
      campaignsCount: campaigns.length,
      activeCampaignsCount: activeCampaigns.length,
      kpis: comparisons
    };

    // Cache the result (5 minutes)
    CacheService.set(cacheKey, result, 300);

    return result;
  }
}

export default DashboardService;
