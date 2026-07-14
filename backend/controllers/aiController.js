import AIService from '../services/aiService.js';

class AIController {
  /**
   * POST /api/analysis/creative
   * Audit a single creative structure using OpenAI GPT model
   */
  static async auditCreative(req, res, next) {
    try {
      const { creativeId, name, copyText, isVideo, metrics, category, performanceBadge } = req.body;

      if (!creativeId || !name || !metrics) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: 'Missing required creative details for auditing.'
        });
      }

      const auditResult = await AIService.generateCreativeAudit({
        id: creativeId,
        name,
        copyText,
        isVideo,
        metrics,
        category,
        performanceBadge
      });

      res.status(200).json({
        success: true,
        data: auditResult
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/analysis/script
   * Generate video script based on description and angle
   */
  static async generateScript(req, res, next) {
    try {
      const { productName, productDescription, angle } = req.body;
      if (!productName || !productDescription) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: 'Product name and description are required.'
        });
      }

      const { default: PromptService } = await import('../services/promptService.js');
      const prompt = PromptService.getScriptPrompt(productName, productDescription, angle || 'General Benefit');

      const openai = AIService.getClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      });

      res.status(200).json({
        success: true,
        data: {
          script: response.choices[0]?.message?.content?.trim()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/analysis/hooks
   * Generate high-converting copywriting hooks
   */
  static async generateHooks(req, res, next) {
    try {
      const { copyText, category } = req.body;
      if (!copyText) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: 'Copywriting context text is required.'
        });
      }

      const { default: PromptService } = await import('../services/promptService.js');
      const prompt = PromptService.getHooksPrompt(copyText, category || 'General');

      const openai = AIService.getClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 500
      });

      res.status(200).json({
        success: true,
        data: {
          hooks: response.choices[0]?.message?.content?.trim()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AIController;
