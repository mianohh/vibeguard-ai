import { GoogleGenAI } from '@google/genai';
import { EffectsSummary, RiskAnalysis, GeminiExplanation } from '@/types';

export class GeminiExplainer {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async explain(effects: EffectsSummary, risk: RiskAnalysis): Promise<GeminiExplanation> {
    try {
      const prompt = this.buildPrompt(effects, risk);

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
      });

      const explanation = this.parseResponse(response.text);
      
      if (this.containsTechnicalData(explanation)) {
        throw new Error('Response contains technical identifiers');
      }

      return explanation;
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.generateDeterministicExplanation(effects, risk);
    }
  }

  private buildPrompt(effects: EffectsSummary, risk: RiskAnalysis): string {
    return `Explain this blockchain transaction in plain English.

Risk Level: ${risk.riskLevel}
Transaction Success: ${effects.success}
Gas Used: ${effects.gasUsed}
Risk Reasons: ${risk.reasons.join(', ')}

Return JSON:
{
  "headline": "Brief summary",
  "plainEnglish": "Simple explanation",
  "bulletPoints": ["Key point"],
  "recommendedAction": "Sign|Be Careful|Do Not Sign",
  "whatToCheck": ["What to verify"]
}`;
  }

  private parseResponse(text: string): GeminiExplanation {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.headline || !parsed.plainEnglish || !parsed.recommendedAction) {
        throw new Error('Missing required fields');
      }

      return {
        headline: parsed.headline,
        plainEnglish: parsed.plainEnglish,
        bulletPoints: parsed.bulletPoints || [],
        recommendedAction: parsed.recommendedAction,
        whatToCheck: parsed.whatToCheck || []
      };
    } catch (error) {
      throw new Error('Failed to parse Gemini response');
    }
  }

  private containsTechnicalData(explanation: GeminiExplanation): boolean {
    const allText = [
      explanation.headline,
      explanation.plainEnglish,
      ...explanation.bulletPoints,
      ...explanation.whatToCheck
    ].join(' ').toLowerCase();

    const technicalPatterns = [
      /0x[a-f0-9]+/,
      /[a-f0-9]{40,}/,
      /[a-za-z0-9+/]{20,}={0,2}/,
      /::[a-z_]+::/,
    ];

    return technicalPatterns.some(pattern => pattern.test(allText));
  }

  private generateDeterministicExplanation(effects: EffectsSummary, risk: RiskAnalysis): GeminiExplanation {
    const riskMessages = {
      RED: {
        headline: 'High Risk Transaction Detected',
        action: 'Do Not Sign' as const,
        plainEnglish: 'This transaction has been flagged as high risk. It may result in loss of assets or unwanted changes to your account.'
      },
      YELLOW: {
        headline: 'Caution Required',
        action: 'Be Careful' as const,
        plainEnglish: 'This transaction requires careful review. While not immediately dangerous, it involves complex operations that should be verified.'
      },
      GREEN: {
        headline: 'Transaction Appears Safe',
        action: 'Sign' as const,
        plainEnglish: 'This transaction appears to be safe based on our analysis. It follows expected patterns with no obvious risks.'
      }
    };

    const riskInfo = riskMessages[risk.riskLevel];

    return {
      headline: riskInfo.headline,
      plainEnglish: riskInfo.plainEnglish,
      bulletPoints: risk.reasons,
      recommendedAction: riskInfo.action,
      whatToCheck: [
        'Verify the transaction is from a trusted source',
        'Confirm you intended to perform this action',
        'Check that any asset amounts match your expectations'
      ]
    };
  }
}