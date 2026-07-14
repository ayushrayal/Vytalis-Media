/**
 * dateHelper - Utility for computing date ranges for Meta API queries
 */
class DateHelper {
  /**
   * Format Date object as YYYY-MM-DD
   */
  static formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  /**
   * Subtract days from a date and return formatted string
   */
  static subtractDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() - days);
    return this.formatDate(date);
  }

  /**
   * Calculate current and previous ranges based on preset
   * @param {string} preset - 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom'
   * @param {object} customRange - { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD' } (optional)
   */
  static getRanges(preset, customRange = null) {
    const todayStr = this.formatDate(new Date());
    let current = { since: todayStr, until: todayStr };
    let previous = { since: todayStr, until: todayStr };

    switch (preset) {
      case 'today':
        current = { since: todayStr, until: todayStr };
        const yesterday = this.subtractDays(todayStr, 1);
        previous = { since: yesterday, until: yesterday };
        break;

      case 'yesterday':
        const yest = this.subtractDays(todayStr, 1);
        current = { since: yest, until: yest };
        const dayBeforeYest = this.subtractDays(todayStr, 2);
        previous = { since: dayBeforeYest, until: dayBeforeYest };
        break;

      case 'last_7_days':
        const sevenDaysAgo = this.subtractDays(todayStr, 6);
        current = { since: sevenDaysAgo, until: todayStr };
        const fourteenDaysAgo = this.subtractDays(todayStr, 13);
        const eightDaysAgo = this.subtractDays(todayStr, 7);
        previous = { since: fourteenDaysAgo, until: eightDaysAgo };
        break;

      case 'last_30_days':
        const thirtyDaysAgo = this.subtractDays(todayStr, 29);
        current = { since: thirtyDaysAgo, until: todayStr };
        const sixtyDaysAgo = this.subtractDays(todayStr, 59);
        const thirtyOneDaysAgo = this.subtractDays(todayStr, 30);
        previous = { since: sixtyDaysAgo, until: thirtyOneDaysAgo };
        break;

      case 'custom':
        if (customRange && customRange.since && customRange.until) {
          current = { since: customRange.since, until: customRange.until };
          
          // Calculate length of custom range
          const start = new Date(customRange.since);
          const end = new Date(customRange.until);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
          
          const prevUntil = this.subtractDays(customRange.since, 1);
          const prevSince = this.subtractDays(customRange.since, diffDays);
          previous = { since: prevSince, until: prevUntil };
        } else {
          // Fallback to last 7 days if custom range is missing
          return this.getRanges('last_7_days');
        }
        break;

      default:
        // Default to last 7 days
        return this.getRanges('last_7_days');
    }

    return { current, previous };
  }
}

export default DateHelper;
