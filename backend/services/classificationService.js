class ClassificationService {
  /**
   * Classify static creative based on metadata (name, primary text, structure)
   */
  static classifyStatic(name = '', copy = '', isCarousel = false) {
    const text = `${name} ${copy}`.toLowerCase();

    if (isCarousel) return 'Carousel';
    if (text.includes('before') || text.includes('after') || text.includes('vs') || text.includes('versus')) return 'Before vs After';
    if (text.includes('us') && text.includes('them') || text.includes('competitor')) return 'Us vs Them';
    if (text.includes('discount') || text.includes('% off') || text.includes('sale') || text.includes('code')) return 'Discount';
    if (text.includes('offer') || text.includes('limited time') || text.includes('deal')) return 'Offer';
    if (text.includes('lifestyle') || text.includes('home') || text.includes('outdoor')) return 'Lifestyle';
    
    // Default fallback
    return 'Product Image';
  }

  /**
   * Classify video creative based on metadata (name, primary text)
   */
  static classifyVideo(name = '', copy = '') {
    const text = `${name} ${copy}`.toLowerCase();

    if (text.includes('unboxing') || text.includes('unpack')) return 'Unboxing';
    if (text.includes('testimonial') || text.includes('review') || text.includes('customer says')) return 'Testimonial';
    if (text.includes('demo') || text.includes('how to') || text.includes('tutorial') || text.includes('demonstration')) return 'Product Demonstration';
    if (text.includes('founder') || text.includes('my story') || text.includes('we started') || text.includes('why i created')) return 'Founder Story';
    if (text.includes('ugc') || text.includes('creator') || text.includes('user generated')) return 'UGC';
    if (text.includes('talking head') || text.includes('host') || text.includes('explaining')) return 'Talking Head';
    if (text.includes('problem') || text.includes('solution') || text.includes('struggling with')) return 'Problem Solution';
    if (text.includes('compare') || text.includes('vs') || text.includes('better than')) return 'Comparison';
    if (text.includes('education') || text.includes('tips') || text.includes('learn')) return 'Educational';
    if (text.includes('voiceover') || text.includes('vo') || text.includes('voice over')) return 'Voice Over';

    // Default fallback
    return 'Review';
  }

  /**
   * Compute performance rating badge based on ROAS and Spend
   */
  static getPerformanceBadge(roas, spend, purchases) {
    if (spend <= 0) return 'Average'; // Not enough data

    if (roas >= 4.0) return 'Excellent';
    if (roas >= 2.5) return 'Great';
    if (roas >= 1.5) return 'Good';
    
    // If we have spent substantial budget but got no purchases, it is critical
    if (spend > 50 && purchases === 0) return 'Critical';
    
    if (roas >= 1.0) return 'Average';
    if (roas >= 0.5) return 'Poor';
    
    return 'Critical';
  }
}

export default ClassificationService;
