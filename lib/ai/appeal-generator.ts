import Anthropic from '@anthropic-ai/sdk';
import { PayerData } from '@/types';
import { APPEAL_GENERATOR_SYSTEM_PROMPT } from './prompts';
import { DEFAULT_AI_MODEL } from '@/lib/constants';
import { buildAppealContext } from '@/lib/knowledge/context-builder';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ClaimForAppeal {
  patientName: string;
  patientDob: Date;
  patientInsuranceId: string;
  payerId?: string | null;
  payerName: string;
  planType?: string | null;
  serviceDate: Date;
  cdtCodes: string[];
  totalAmount: number;
  denialReason?: string | null;
  denialCode?: string | null;
}

export async function generateAppealLetter(
  claim: ClaimForAppeal,
  denialReason: string,
  payerIntelligence: PayerData | null,
  model: string = DEFAULT_AI_MODEL
): Promise<string> {
  const payerContext = payerIntelligence
    ? `\nKnown payer quirks: ${payerIntelligence.documentationQuirks.join('; ')}`
    : '';

  const knowledgeContext = buildAppealContext(claim.cdtCodes, claim.payerId ?? '', denialReason);

  const prompt = `Generate a professional dental insurance appeal letter for this denied claim.

Patient: ${claim.patientName}
Date of Birth: ${new Date(claim.patientDob).toLocaleDateString()}
Insurance ID: ${claim.patientInsuranceId}
Payer: ${claim.payerName}
Plan Type: ${claim.planType || 'PPO'}
Service Date: ${new Date(claim.serviceDate).toLocaleDateString()}
CDT Codes: ${claim.cdtCodes.join(', ')}
Billed Amount: $${claim.totalAmount}
Denial Reason: ${denialReason}
Denial Code: ${claim.denialCode || 'See EOB'}
${payerContext}
${knowledgeContext}

Write a complete, professional appeal letter ready to mail. Use [DATE], [CLAIM NUMBER], [REFERENCE NUMBER], and [PROVIDER NPI] as placeholders where needed.`;

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: APPEAL_GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Appeal letter generation failed.';
}
