class FilterService {
  /**
   * Parse a range value helper
   */
  static matchesRange(value, bracket) {
    if (!bracket) return true;
    
    // Normalize bracket
    const cleanBracket = bracket.replace(/\s/g, '').toLowerCase();

    // Custom check for Has Purchases
    if (cleanBracket === 'yes') return value > 0;
    if (cleanBracket === 'no') return value === 0;

    // Check for '+' patterns
    if (cleanBracket.endsWith('+')) {
      const min = parseFloat(cleanBracket.slice(0, -1).replace(/[^0-9.]/g, ''));
      return value >= min;
    }

    // Check for '<' patterns
    if (cleanBracket.startsWith('<')) {
      const max = parseFloat(cleanBracket.slice(1).replace(/[^0-9.]/g, ''));
      return value < max;
    }

    // Check for '>' patterns
    if (cleanBracket.startsWith('>')) {
      const min = parseFloat(cleanBracket.slice(1).replace(/[^0-9.]/g, ''));
      return value > min;
    }

    // Check for 'x' suffix (like ROAS 1-2x)
    const normalized = cleanBracket.replace(/x/g, '');

    // Check for range patterns (e.g. 500-2000 or 1-2)
    if (normalized.includes('-')) {
      const parts = normalized.split('-');
      const min = parseFloat(parts[0].replace(/[^0-9.]/g, ''));
      const max = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
      return value >= min && value <= max;
    }

    return true;
  }

  /**
   * Apply dynamic filters to a creatives list based on query parameters
   */
  static applyCreativeFilters(creatives, query = {}) {
    let filtered = [...creatives];
    const {
      status,
      badge,
      rating,
      category,
      creativeType,
      mediaType,
      platform,
      placement,
      hasPurchases,
      spend,
      roas,
      ctr,
      cpa,
      cpm,
      cpc,
      purchases,
      revenue,
      frequency,
      hookRate,
      holdRate
    } = query;

    // 1. Status Filter
    if (status) {
      const statusLower = status.toLowerCase();
      filtered = filtered.filter(c => 
        c.ads && c.ads.some(ad => ad.adStatus.toLowerCase() === statusLower)
      );
    }

    // 2. Rating/Performance Badge Filter
    const targetRating = rating || badge;
    if (targetRating) {
      const ratingList = targetRating.toLowerCase().split(',').map(s => s.trim());
      filtered = filtered.filter(c => 
        (c.performanceBadge && ratingList.includes(c.performanceBadge.toLowerCase()))
      );
    }


    // 3. Category Filter
    if (category) {
      const catLower = category.toLowerCase();
      filtered = filtered.filter(c => 
        c.category && c.category.toLowerCase().includes(catLower)
      );
    }

    // 4. Creative Type / Media Type Filter
    const targetMediaType = mediaType || creativeType;
    if (targetMediaType) {
      const typeLower = targetMediaType.toLowerCase();
      if (typeLower === 'image' || typeLower === 'static') {
        filtered = filtered.filter(c => !c.isVideo && c.category !== 'Carousel');
      } else if (typeLower === 'video') {
        filtered = filtered.filter(c => c.isVideo);
      } else if (typeLower === 'carousel') {
        filtered = filtered.filter(c => c.category === 'Carousel' || !c.isVideo && c.name.toLowerCase().includes('carousel'));
      }
    }

    // 5. Platform Filter
    if (platform) {
      const platLower = platform.toLowerCase();
      filtered = filtered.filter(c => 
        c.ads && c.ads.some(ad => 
          ad.adName.toLowerCase().includes(platLower) ||
          ad.campaignName.toLowerCase().includes(platLower) ||
          ad.adsetName.toLowerCase().includes(platLower)
        )
      );
    }

    // 6. Placement Filter
    if (placement) {
      const placeLower = placement.toLowerCase();
      filtered = filtered.filter(c => 
        c.ads && c.ads.some(ad => 
          ad.adName.toLowerCase().includes(placeLower) ||
          ad.campaignName.toLowerCase().includes(placeLower) ||
          ad.adsetName.toLowerCase().includes(placeLower)
        )
      );
    }

    // 7. Has Purchases Filter
    if (hasPurchases) {
      const val = hasPurchases.toLowerCase();
      filtered = filtered.filter(c => 
        val === 'yes' ? (c.metrics?.purchases || 0) > 0 : (c.metrics?.purchases || 0) === 0
      );
    }

    // 8. Range Metric Filters
    if (spend) filtered = filtered.filter(c => this.matchesRange(c.metrics?.spend || 0, spend));
    if (roas) filtered = filtered.filter(c => this.matchesRange(c.metrics?.roas || 0, roas));
    if (ctr) filtered = filtered.filter(c => this.matchesRange(c.metrics?.ctr || 0, ctr));
    if (cpa) filtered = filtered.filter(c => this.matchesRange(c.metrics?.cpa || 0, cpa));
    if (cpm) filtered = filtered.filter(c => this.matchesRange(c.metrics?.cpm || 0, cpm));
    if (cpc) filtered = filtered.filter(c => this.matchesRange(c.metrics?.cpc || 0, cpc));
    if (purchases) filtered = filtered.filter(c => this.matchesRange(c.metrics?.purchases || 0, purchases));
    if (revenue) filtered = filtered.filter(c => this.matchesRange(c.metrics?.purchaseConversionValue || 0, revenue));
    if (frequency) filtered = filtered.filter(c => this.matchesRange(c.metrics?.frequency || 1, frequency));
    if (hookRate) filtered = filtered.filter(c => this.matchesRange(c.metrics?.hookRate || 0, hookRate));
    if (holdRate) filtered = filtered.filter(c => this.matchesRange(c.metrics?.holdRate || 0, holdRate));

    return filtered;
  }

  /**
   * Apply text search across multiple fields in-memory
   */
  static applySearch(list, searchString, fields = []) {
    if (!searchString) return list;
    const query = searchString.toLowerCase();

    return list.filter(item => {
      return fields.some(fieldPath => {
        // Resolve nested paths (e.g. 'metrics.spend' or 'ads')
        const parts = fieldPath.split('.');
        let val = item;
        for (const part of parts) {
          if (val === null || val === undefined) break;
          val = val[part];
        }

        if (Array.isArray(val)) {
          // Special match for list of objects, e.g. ad lists
          return val.some(subItem => {
            return Object.values(subItem).some(subVal => 
              String(subVal || '').toLowerCase().includes(query)
            );
          });
        }

        return String(val || '').toLowerCase().includes(query);
      });
    });
  }

  /**
   * Sort array in-memory
   */
  static applySorting(list, sortKey = 'spend', order = 'desc') {
    const sorted = [...list];
    const isDesc = order.toLowerCase() === 'desc';

    sorted.sort((a, b) => {
      // Handle nested sort keys (e.g. 'metrics.spend')
      const resolve = (obj, path) => {
        const parts = path.split('.');
        let val = obj;
        for (const part of parts) {
          val = val?.[part];
        }
        return val;
      };

      let valA = resolve(a, sortKey);
      let valB = resolve(b, sortKey);

      if (typeof valA === 'string') {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }

      valA = valA || 0;
      valB = valB || 0;
      return isDesc ? valB - valA : valA - valB;
    });

    return sorted;
  }

  /**
   * Slice array for page pagination
   */
  static applyPagination(list, page = 1, limit = 10) {
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    
    const total = list.length;
    const totalPages = Math.ceil(total / parsedLimit);
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginated = list.slice(startIndex, startIndex + parsedLimit);

    return {
      data: paginated,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages
      }
    };
  }
}

export default FilterService;
