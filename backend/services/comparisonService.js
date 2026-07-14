class ComparisonService {
  /**
   * Compare two values for a specific metric and return status, diff, percentage, and direction
   */
  static compareMetric(currentVal, previousVal, metricName) {
    const current = parseFloat(currentVal || 0);
    const previous = parseFloat(previousVal || 0);
    const diff = current - previous;
    const pct = previous > 0 ? (diff / previous) * 100 : 0;
    
    let direction = 'stable';
    if (diff > 0.0001) direction = 'up';
    if (diff < -0.0001) direction = 'down';

    // Define whether higher or lower is better
    const lowerIsBetter = ['cpa', 'cpm', 'cpc'].includes(metricName.toLowerCase());
    
    let status = 'stable';
    
    // Check if the change is significant enough (> 0.5% change) to be improved/declined
    const threshold = 0.5;
    const absPct = Math.abs(pct);

    if (absPct >= threshold) {
      if (diff > 0) {
        status = lowerIsBetter ? 'declined' : 'improved';
      } else {
        status = lowerIsBetter ? 'improved' : 'declined';
      }
    }

    return {
      current,
      previous,
      diff,
      pct,
      direction,
      status
    };
  }

  /**
   * Compare two fully aggregated insight objects and return compared KPIs
   */
  static compareInsights(currentInsights, previousInsights) {
    const metricsToCompare = [
      'spend',
      'purchases',
      'cpa',
      'roas',
      'purchaseConversionValue',
      'ctr',
      'cpm',
      'cpc',
      'reach',
      'impressions',
      'clicks',
      'frequency'
    ];

    const compared = {};
    metricsToCompare.forEach(metric => {
      compared[metric] = this.compareMetric(
        currentInsights[metric] || 0,
        previousInsights[metric] || 0,
        metric
      );
    });

    return compared;
  }
}

export default ComparisonService;
