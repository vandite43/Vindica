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
  // ── HIPAA COMPLIANCE ────────────────────────────────────────────────────────
  // PHI (patient name, DOB, insurance ID) must NEVER be sent to Anthropic.
  // The prompt uses [PATIENT_NAME], [PATIENT_DOB], [PATIENT_INSURANCE_ID] as
  // literal placeholder tokens. After the API call returns, real PHI is
  // substituted locally (see .replace() calls at the bottom of this function).
  // This function asserts that PHI did not leak into the prompt before sending.
  // ───────────────────────────────────────────────────────────────────────────

  const payerContext = payerIntelligence
    ? `\nKnown payer quirks: ${payerIntelligence.documentationQuirks.join('; ')}`
    : '';

  const knowledgeContext = buildAppealContext(claim.cdtCodes, claim.payerId ?? '', denialReason);

  const prompt = `Generate a professional dental insurance appeal letter for this denied claim.

Patient: [PATIENT_NAME]
Date of Birth: [PATIENT_DOB]
Insurance ID: [PATIENT_INSURANCE_ID]
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

  // PHI assertion — throws before sending if any PHI leaked into the prompt
  const phiPatterns = [claim.patientName, claim.patientInsuranceId].filter(Boolean);
  for (const phi of phiPatterns) {
    if (prompt.includes(phi)) {
      throw new Error('HIPAA violation prevented: PHI detected in AI prompt. Generation blocked.');
    }
  }

  const response = await client.messages.create({
    model,
    max_tokens: 3000,
    system: APPEAL_GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const letter = response.content[0].type === 'text' ? response.content[0].text : 'Appeal letter generation failed.';
  return letter
    .replace(/\[PATIENT_NAME\]/g, claim.patientName)
    .replace(/\[PATIENT_DOB\]/g, new Date(claim.patientDob).toLocaleDateString())
    .replace(/\[PATIENT_INSURANCE_ID\]/g, claim.patientInsuranceId);
}
