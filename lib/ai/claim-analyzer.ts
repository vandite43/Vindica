import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ClaimAnalysis, ClaimInput, PayerData } from '@/types';
import { CLAIM_ANALYZER_SYSTEM_PROMPT } from './prompts';
import { DEFAULT_AI_MODEL } from '@/lib/constants';
import { buildClaimContext } from '@/lib/knowledge/context-builder';

const RiskFactorSchema = z.object({
  factor:         z.string(),
  severity:       z.enum(['low', 'medium', 'high', 'critical']),
  recommendation: z.string(),
});

const CdtCodeAnalysisSchema = z.object({
  code:             z.string(),
  issue:            z.string(),
  alternativeCode:  z.string().nullable().optional(),
  rationale:        z.string(),
});

const ClaimAnalysisSchema = z.object({
  denialRiskScore:                z.number().min(0).max(100),
  riskLevel:                      z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  riskFactors:                    z.array(RiskFactorSchema),
  cdtCodeAnalysis:                z.array(CdtCodeAnalysisSchema),
  missingDocumentation:           z.array(z.string()),
  payerSpecificWarnings:          z.array(z.string()),
  recommendedActions:             z.array(z.string()),
  estimatedCleanClaimProbability: z.number().min(0).max(100),
  summary:                        z.string(),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Strips sequences that could be used for prompt injection.
 * Removes control-character-heavy patterns and instruction-like phrases.
 */
function s(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .replace(/\[(?:SYSTEM|INST|INSTRUCTION|DATA|\/DATA|END|IGNORE|OVERRIDE)\]/gi, '') // strip delimiter-like tags
    .slice(0, 500); // hard cap per field
}

export async function analyzeClaim(claim: ClaimInput, payerIntelligence: PayerData | null, model: string = DEFAULT_AI_MODEL): Promise<ClaimAnalysis> {
  const payerContext = payerIntelligence
    ? `\nPayer Intelligence for ${s(payerIntelligence.name)}:
- Historical denial rate: ${payerIntelligence.denialRate ? (payerIntelligence.denialRate * 100).toFixed(1) + '%' : 'Unknown'}
- Common denial reasons: ${payerIntelligence.commonDenialReasons.map(s).join(', ')}
- Requires pre-auth for: ${payerIntelligence.requiresPreAuth.map(s).join(', ')}
- Documentation quirks: ${payerIntelligence.documentationQuirks.map(s).join('; ')}`
    : '';

  const prompt = `Analyze this dental insurance claim and return a JSON risk assessment.

[CLAIM DATA START]
- Payer: ${s(claim.payerName)} (ID: ${s(claim.payerId)})
- Plan Type: ${s(claim.planType || 'Unknown')}
- Service Date: ${claim.serviceDate}
- CDT Codes: ${claim.cdtCodes.map(s).join(', ')}
- Tooth Numbers: ${claim.toothNumbers?.length ? claim.toothNumbers.map(s).join(', ') : 'Not specified'}
- Diagnosis Codes: ${claim.diagnosisCodes.map(s).join(', ')}
- Total Amount: $${claim.totalAmount}
- Treating Provider NPI: ${s(claim.providerNpi || 'Not provided')}
- Pre-auth Number: ${s(claim.preAuthNumber || 'N/A')}
- Documentation attached: X-rays=${claim.xraysAttached}, Perio Chart=${claim.perioCharting}, Pre-auth=${claim.preAuthObtained}, Narrative=${claim.narrativeIncluded}
[CLAIM DATA END]
${payerContext}
${buildClaimContext(claim)}

Return ONLY this JSON structure:
{
  "denialRiskScore": <0-100>,
  "riskLevel": <"LOW"|"MEDIUM"|"HIGH"|"CRITICAL">,
  "riskFactors": [{"factor": string, "severity": "low"|"medium"|"high"|"critical", "recommendation": string}],
  "cdtCodeAnalysis": [{"code": string, "issue": string, "alternativeCode": string|null, "rationale": string}],
  "missingDocumentation": [string],
  "payerSpecificWarnings": [string],
  "recommendedActions": [string],
  "estimatedCleanClaimProbability": <0-100>,
  "summary": string
}`;

  // API call — let any error (auth, model not found, rate limit) propagate so the
  // route can return a real error instead of saving fake data to the DB.
  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    temperature: 0,
    system: CLAIM_ANALYZER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Attempt 1: strip markdown fences and parse directly
  const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const tryParse = (raw: string): ClaimAnalysis => {
    const parsed = JSON.parse(raw);
    return ClaimAnalysisSchema.parse(parsed) as ClaimAnalysis;
  };
  try {
    return tryParse(stripped);
  } catch {
    // Attempt 2: extract the first {...} block via regex in case there is surrounding text
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return tryParse(match[0]);
      } catch {
        // fall through to throw below
      }
    }
    throw new Error(`Claude returned a non-JSON response. Raw output: ${text.slice(0, 300)}`);
  }
}
