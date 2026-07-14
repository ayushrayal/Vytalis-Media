import config from '../config/recommendationConfig.js';
import { PerfTracker } from '../utils/perfTracker.js';

class RecommendationService {
  /**
   * Generate structured recommendations for campaigns
   */
  static generateCampaignRecommendations(overview, campaign, trends = [], adSets = []) {
    const start = Date.now();
    if (process.env.NODE_ENV !== 'production') {
      console.time("Recommendations");
    }

    try {
      const recommendations = [];
      const spend = overview?.spend || 0;
      const purchases = overview?.purchases || 0;
      const roas = overview?.roas || 0;
      const ctr = overview?.ctr || 0;
      const cpa = overview?.cpa || 0;

      const { campaign: threshold } = config;

      if (spend > 0) {
        // 1. CTR rules
        if (ctr < threshold.lowCTR) {
          recommendations.push({
            type: 'warning',
            severity: 'high',
            title: 'Low Click-Through Rate (CTR)',
            message: `CTR is currently ${ctr.toFixed(2)}%, which is below the benchmark of ${threshold.lowCTR}%. Consider testing new ad creative headlines, primary copy text, or hooks to improve ad relevance.`
          });
        } else if (ctr >= threshold.goodCTR) {
          recommendations.push({
            type: 'strength',
            severity: 'low',
            title: 'Excellent Click-Through Rate (CTR)',
            message: `Excellent CTR of ${ctr.toFixed(2)}% detected! The creative is highly engaging. Ensure the landing page is optimized for conversions.`
          });
        }

        // 2. ROAS rules
        if (roas < threshold.poorRoas && spend > 1000) {
          recommendations.push({
            type: 'warning',
            severity: 'high',
            title: 'Unprofitable Campaign ROAS',
            message: `ROAS is currently ${roas.toFixed(2)}x. Total spend is ₹${spend.toFixed(2)} with only ${purchases} purchases. Pause underperforming ad sets or creatives immediately to prevent budget waste.`
          });
        } else if (roas >= threshold.goodRoas && campaign?.status === 'ACTIVE') {
          recommendations.push({
            type: 'recommendation',
            severity: 'medium',
            title: 'Increase Daily Budget',
            message: `Strong ROAS of ${roas.toFixed(2)}x detected! Consider increasing the daily budget by 15-20% to scale conversions without triggering learning phase resets.`
          });
        }

        // 3. CPA rules
        if (cpa > threshold.highCPA) {
          recommendations.push({
            type: 'warning',
            severity: 'medium',
            title: 'High Cost Per Acquisition (CPA)',
            message: `Average CPA is ₹${cpa.toFixed(2)} (threshold is ₹${threshold.highCPA}). Verify if this exceeds target product margin. Consider narrowing target audience parameters.`
          });
        }

        // 4. Frequency / Audience Fatigue rules
        const impressions = overview?.impressions || 0;
        const reach = overview?.reach || 0;
        const frequency = reach > 0 ? impressions / reach : 1;
        if (frequency > threshold.maxFrequency) {
          recommendations.push({
            type: 'warning',
            severity: 'high',
            title: 'Audience Fatigue Warning',
            message: `Ad frequency has reached ${frequency.toFixed(2)} (threshold is ${threshold.maxFrequency}). The target audience is seeing ads multiple times, leading to fatigue. Refresh creatives.`
          });
        }

        // 5. Ad Set duplicate winning recommendation
        if (adSets.length > 0) {
          const topAdSet = adSets.sort((a, b) => b.roas - a.roas)[0];
          if (topAdSet.roas >= threshold.goodRoas && topAdSet.purchases >= 5) {
            recommendations.push({
              type: 'recommendation',
              severity: 'low',
              title: 'Scale Winning Audience',
              message: `Ad set "${topAdSet.name}" is performing exceptionally well with a ROAS of ${topAdSet.roas}x. Consider duplicating this audience stack or creating lookalikes.`
            });
          }
        }
      } else {
        recommendations.push({
          type: 'recommendation',
          severity: 'low',
          title: 'Campaign Awaiting Initial Data',
          message: 'Accumulating initial performance metrics. Ensure ads are active and tracking Meta Pixel/API conversion events correctly.'
        });
      }

      return recommendations;
    } finally {
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd("Recommendations");
        const duration = Date.now() - start;
        PerfTracker.track('recommendations', duration);
      }
    }
  }


  /**
   * Generate structured recommendations for creatives
   */
  static generateCreativeRecommendations(metrics, creative) {
    const start = Date.now();
    if (process.env.NODE_ENV !== 'production') {
      console.time("Recommendations");
    }

    try {
      const recommendations = [];
      const spend = metrics?.spend || 0;
      const roas = metrics?.roas || 0;
      const ctr = metrics?.ctr || 0;
      const cpa = metrics?.cpa || 0;
      const purchases = metrics?.purchases || 0;
      const hookRate = metrics?.hookRate || 0;
      const holdRate = metrics?.holdRate || 0;

      const { creative: threshold } = config;

      if (spend > 0) {
        if (creative?.isVideo) {
          // Hook Rate
          if (hookRate >= threshold.goodHookRate) {
            recommendations.push({
              type: 'strength',
              severity: 'low',
              title: 'Strong Video Hook Rate',
              message: `Excellent hook rate of ${hookRate.toFixed(1)}%! The first 3 seconds of the video are highly engaging. Model future creatives on this intro design.`
            });
          } else if (hookRate < threshold.lowHookRate) {
            recommendations.push({
              type: 'warning',
              severity: 'high',
              title: 'Weak Video Hook Rate',
              message: `Hook rate is only ${hookRate.toFixed(1)}% (benchmark is ${threshold.lowHookRate}%). The opening hook fails to capture attention. Try testing different 3-second intros or overlays.`
            });
          }

          // Hold Rate
          if (holdRate >= threshold.goodHoldRate) {
            recommendations.push({
              type: 'strength',
              severity: 'low',
              title: 'Strong Video Hold Rate',
              message: `Great hold rate of ${holdRate.toFixed(1)}%! Users watch the video through to completion. Your product benefits pitch is working.`
            });
          } else if (holdRate < threshold.lowHoldRate) {
            recommendations.push({
              type: 'warning',
              severity: 'medium',
              title: 'Weak Video Hold Rate',
              message: `Hold rate is only ${holdRate.toFixed(1)}%. Users drop off quickly. Consider trimming unnecessary length or adding a faster transition to the call to action.`
            });
          }
        }

        if (ctr < threshold.lowCTR) {
          recommendations.push({
            type: 'warning',
            severity: 'medium',
            title: 'Low Creative CTR',
            message: `CTR is ${ctr.toFixed(2)}%, which is below average. Try changing the ad headline or CTA text to make it more compelling.`
          });
        }

        if (roas >= threshold.goodRoas && purchases >= 5) {
          recommendations.push({
            type: 'recommendation',
            severity: 'high',
            title: 'Scale Winning Creative Asset',
            message: `This creative is highly profitable with a ROAS of ${roas.toFixed(2)}x. Recommend allocating more budget or testing it in broader campaigns.`
          });
        } else if (roas < threshold.poorRoas && spend > 500) {
          recommendations.push({
            type: 'warning',
            severity: 'high',
            title: 'Underperforming Creative Asset',
            message: `ROAS is low (${roas.toFixed(2)}x). Consider pausing this creative or testing a new variation of the visual copy.`
          });
        }
      } else {
        recommendations.push({
          type: 'recommendation',
          severity: 'low',
          title: 'Creative Awaiting Data',
          message: 'Accumulating performance data. Once delivery starts, we will analyze hook and hold rates.'
        });
      }

      return recommendations;
    } finally {
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd("Recommendations");
        const duration = Date.now() - start;
        PerfTracker.track('recommendations', duration);
      }
    }
  }

}

export default RecommendationService;
