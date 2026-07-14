class AnalyticsService {
  /**
   * Calculate basic statistics for a numeric key in a series of objects
   */
  static calculateStats(series, key) {
    if (!Array.isArray(series) || series.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0, total: 0 };
    }

    const values = series.map(item => parseFloat(item[key] || 0)).sort((a, b) => a - b);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;

    // Median calculation
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

    const min = values[0];
    const max = values[values.length - 1];

    return {
      average: parseFloat(average.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }

  /**
   * Compute moving average for a series of objects
   */
  static calculateMovingAverage(series, key, windowSize = 7) {
    if (!Array.isArray(series)) return [];

    return series.map((item, idx) => {
      const startIdx = Math.max(0, idx - windowSize + 1);
      const windowItems = series.slice(startIdx, idx + 1);
      const sum = windowItems.reduce((acc, curr) => acc + parseFloat(curr[key] || 0), 0);
      const movingAvg = sum / windowItems.length;

      return {
        ...item,
        [`${key}MA`]: parseFloat(movingAvg.toFixed(2))
      };
    });
  }

  /**
   * Calculate percentage growth between current and previous values
   */
  static calculateGrowth(currentVal, previousVal) {
    const current = parseFloat(currentVal || 0);
    const previous = parseFloat(previousVal || 0);

    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    const growth = ((current - previous) / previous) * 100;
    return parseFloat(growth.toFixed(2));
  }
}

export default AnalyticsService;
