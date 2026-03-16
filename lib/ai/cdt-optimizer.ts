import Anthropic from '@anthropic-ai/sdk';
import { CDT_OPTIMIZER_SYSTEM_PROMPT } from './prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CdtOptimization {
  originalCode: string;
  suggestedCode: string | null;
  reason: string;
  confidenceScore: number;
}

export async function optimizeCdtCodes(
  codes: string[],
  payerName: string,
  planType: string
): Promise<CdtOptimization[]> {
  const prompt = `Analyze these CDT codes for claim optimization with ${payerName} (${planType} plan): ${codes.join(', ')}

Return JSON array:
[{"originalCode": string, "suggestedCode": string|null, "reason": string, "confidenceScore": 0-100}]`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: CDT_OPTIMIZER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return codes.map(code => ({ originalCode: code, suggestedCode: null, reason: 'Optimization unavailable', confidenceScore: 0 }));
  }
}
