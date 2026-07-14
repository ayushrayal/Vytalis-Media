import OpenAI from 'openai';
import PromptService from './promptService.js';

class AIService {
  /**
   * Initialize and return OpenAI client instance
   */
  static getClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API Key is not configured. Please add a valid OPENAI_API_KEY to your backend .env file.');
    }
    return new OpenAI({ apiKey });
  }

  /**
   * Perform comprehensive AI creative audit
   */
  static async generateCreativeAudit(creativeDetails) {
    const openai = this.getClient();
    const prompt = PromptService.getCreativeAuditPrompt(creativeDetails);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an elite advertising copywriter and media buyer. You only respond with raw JSON matching the exact schema requested, without markdown wrappers.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const textContent = response.choices[0]?.message?.content?.trim();
    if (!textContent) {
      throw new Error('Received empty response from OpenAI.');
    }

    try {
      return JSON.parse(textContent);
    } catch (parseError) {
      console.warn('[AI Service] Direct JSON parse failed, attempting clean-up of markdown wrappers...');
      // Strip markdown code block backticks if present
      const cleaned = textContent.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    }
  }
}

export default AIService;
