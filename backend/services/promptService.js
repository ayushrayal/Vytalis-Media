class PromptService {
  /**
   * Main creative audit prompt template
   */
  static getCreativeAuditPrompt(creativeDetails) {
    const { name, copyText, isVideo, metrics, category, performanceBadge } = creativeDetails;
    
    return `
You are an expert Meta Ads Media Buyer and Creative Strategist.
Please perform a detailed performance audit on the following ad creative:

- Creative Name: "${name}"
- Format Type: ${isVideo ? 'Video' : 'Static Image'}
- Rule-based Tag Category: ${category}
- Performance Badge: ${performanceBadge}
- Copywriting Text (Primary Text):
"""
${copyText || 'No text defined'}
"""

Current Period Metrics:
- Total Spend: $${metrics.spend.toFixed(2)}
- Purchases: ${metrics.purchases}
- Cost Per Acquisition (CPA): $${metrics.cpa.toFixed(2)}
- Return on Ad Spend (ROAS): ${metrics.roas.toFixed(2)}x
- Click-Through Rate (CTR): ${metrics.ctr.toFixed(2)}%
- Cost Per Mille (CPM): $${metrics.cpm.toFixed(2)}
${isVideo ? `- Hook Rate (3s watch/impression): ${metrics.hookRate?.toFixed(1)}%` : ''}
${isVideo ? `- Hold Rate (ThruPlay/3s watch): ${metrics.holdRate?.toFixed(1)}%` : ''}

Please analyze this creative and output a JSON object with the following structure:
{
  "performanceReview": "A detailed explanation of why this creative performed well, underperformed, or remained average, linking the copywriting hooks and media type with the metrics (ROAS, CPA, CTR, CPM, Hook/Hold Rates).",
  "scalingSuggestions": "Actionable, concrete suggestions on budget allocation, bid strategies, or scaling (e.g. increase budget, test as broad, consolidate, etc.).",
  "improvements": "Specific copy or visual adjustments to optimize this creative (e.g. change the first 3 seconds, revise CTA, try different angles, color adjustments, etc.).",
  "hooks": [
    "Vibrant hook idea 1 (first 3 seconds / headline)",
    "Vibrant hook idea 2",
    "Vibrant hook idea 3"
  ],
  "script": "A short, conversion-focused 30-second UGC/video script storyboard outline, structured with Hook, Body, and CTA sections, specifically tailored to improve this ad's angle."
}

Do NOT include any markdown blocks (like \`\`\`json) in your response. Output raw JSON string only.
`;
  }

  /**
   * Prompts for specific sub-generators
   */
  static getScriptPrompt(creativeName, copyText, angle) {
    return `Generate a 60-second conversion-focused UGC video script for the product "${creativeName}" with angle "${angle}". Original ad copy: "${copyText}". Output sections: Hook, Body, CTA.`;
  }

  static getHooksPrompt(copyText, category) {
    return `Generate 5 high-converting hook headline ideas for a Meta ad. Original copy: "${copyText}". Category: ${category}.`;
  }
}

export default PromptService;
