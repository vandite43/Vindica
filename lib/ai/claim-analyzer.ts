import Anthropic from '@anthropic-ai/sdk';
import { ClaimAnalysis, ClaimInput, PayerData } from '@/types';
import { CLAIM_ANALYZER_SYSTEM_PROMPT } from './prompts';
import { DEFAULT_AI_MODEL } from '@/lib/constants';
import { buildClaimContext } from '@/lib/knowledge/context-builder';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeClaim(claim: ClaimInput, payerIntelligence: PayerData | null, model: string = DEFAULT_AI_MODEL): Promise<ClaimAnalysis> {
  const payerContext = payerIntelligence
    ? `\nPayer Intelligence for ${payerIntelligence.name}:
- Historical denial rate: ${payerIntelligence.denialRate ? (payerIntelligence.denialRate * 100).toFixed(1) + '%' : 'Unknown'}
- Common denial reasons: ${payerIntelligence.commonDenialReasons.join(', ')}
- Requires pre-auth for: ${payerIntelligence.requiresPreAuth.join(', ')}
- Documentation quirks: ${payerIntelligence.documentationQuirks.join('; ')}`
    : '';

  const prompt = `Analyze this dental insurance claim and return a JSON risk assessment.

Claim Details:
- Patient: ${claim.patientName}, DOB: ${claim.patientDob}
- Insurance ID: ${claim.patientInsuranceId}
- Payer: ${claim.payerName} (ID: ${claim.payerId})
- Plan Type: ${claim.planType || 'Unknown'}
- Service Date: ${claim.serviceDate}
- CDT Codes: ${claim.cdtCodes.join(', ')}
- Tooth Numbers: ${claim.toothNumbers?.length ? claim.toothNumbers.join(', ') : 'Not specified'}
- Diagnosis Codes: ${claim.diagnosisCodes.join(', ')}
- Total Amount: $${claim.totalAmount}
- Treating Provider NPI: ${claim.providerNpi || 'Not provided'}
- Pre-auth Number: ${claim.preAuthNumber || 'N/A'}
- Documentation attached: X-rays=${claim.xraysAttached}, Perio Chart=${claim.perioCharting}, Pre-auth=${claim.preAuthObtained}, Narrative=${claim.narrativeIncluded}
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

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: CLAIM_ANALYZER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as ClaimAnalysis;
  } catch (error) {
    console.error('Claim analysis error:', error);
    // Return graceful degraded response
    return {
      denialRiskScore: 50,
      riskLevel: 'MEDIUM',
      riskFactors: [{ factor: 'Analysis unavailable', severity: 'medium', recommendation: 'Review claim manually' }],
      cdtCodeAnalysis: [],
      missingDocumentation: [],
      payerSpecificWarnings: [],
      recommendedActions: ['Review claim documentation manually'],
      estimatedCleanClaimProbability: 50,
      summary: 'AI analysis temporarily unavailable. Please review claim manually.',
    };
  }
}
