import { ClaimInput } from '@/types';
import { CDT_CODES } from './cdt-codes';
import { PAYER_POLICIES } from './payer-policies';
import { ICD10_SUPPORT } from './icd10-support';
import { CLINICAL_GUIDELINES, CDT_TO_GUIDELINE_MAP } from './clinical-guidelines';

export function buildClaimContext(claim: ClaimInput): string {
  const sections: string[] = [];

  // 1. CDT Code definitions and requirements
  const cdtSection = buildCdtSection(claim.cdtCodes);
  if (cdtSection) sections.push(cdtSection);

  // 2. Payer-specific rules
  const payerSection = buildPayerSection(claim.payerId, claim.cdtCodes);
  if (payerSection) sections.push(payerSection);

  // 3. ICD-10 diagnosis support
  const diagnosisSection = buildDiagnosisSection(claim.diagnosisCodes, claim.cdtCodes);
  if (diagnosisSection) sections.push(diagnosisSection);

  // 4. Clinical guidelines
  const guidelinesSection = buildGuidelinesSection(claim.cdtCodes);
  if (guidelinesSection) sections.push(guidelinesSection);

  if (sections.length === 0) return '';

  return `\n\n[KNOWLEDGE BASE — USE THIS TO GROUND YOUR ANALYSIS]\n${'='.repeat(60)}\n${sections.join('\n\n')}\n${'='.repeat(60)}`;
}

export function buildAppealContext(cdtCodes: string[], payerId: string, denialReason: string): string {
  const sections: string[] = [];

  const cdtSection = buildCdtSection(cdtCodes);
  if (cdtSection) sections.push(cdtSection);

  const payerSection = buildPayerSection(payerId, cdtCodes);
  if (payerSection) sections.push(payerSection);

  const guidelinesSection = buildGuidelinesSection(cdtCodes);
  if (guidelinesSection) sections.push(guidelinesSection);

  const appealTipsSection = buildAppealTipsSection(payerId, denialReason);
  if (appealTipsSection) sections.push(appealTipsSection);

  if (sections.length === 0) return '';

  return `\n\n[KNOWLEDGE BASE — USE THIS TO WRITE THE APPEAL]\n${'='.repeat(60)}\n${sections.join('\n\n')}\n${'='.repeat(60)}`;
}

function buildCdtSection(cdtCodes: string[]): string {
  const lines: string[] = ['CDT CODE REFERENCE:'];
  let found = false;

  for (const code of cdtCodes) {
    const entry = CDT_CODES[code];
    if (!entry) continue;
    found = true;

    lines.push(`\n${code} — ${entry.description}`);
    lines.push(`  Required documentation: ${entry.requiredDocs.join(' | ')}`);
    lines.push(`  Frequency limit: ${entry.frequencyLimit}`);
    if (entry.bundlingConflicts.length > 0) {
      lines.push(`  Bundling conflicts (cannot bill together): ${entry.bundlingConflicts.join(', ')}`);
    }
    if (entry.preAuthRequired) {
      lines.push(`  ⚠ Pre-authorization REQUIRED for this code`);
    }
    if (entry.supportingDiagnoses.length > 0) {
      lines.push(`  Diagnosis codes that support this procedure: ${entry.supportingDiagnoses.join(', ')}`);
    }
  }

  return found ? lines.join('\n') : '';
}

function buildPayerSection(payerId: string, cdtCodes: string[]): string {
  const policy = PAYER_POLICIES[payerId];
  if (!policy) return '';

  const lines: string[] = ['PAYER-SPECIFIC RULES:'];

  // Only inject frequency rules relevant to the claim's CDT codes
  const relevantFrequency = Object.entries(policy.frequencyRules).filter(([code]) =>
    cdtCodes.includes(code)
  );
  if (relevantFrequency.length > 0) {
    lines.push('\nFrequency rules for codes in this claim:');
    for (const [code, rule] of relevantFrequency) {
      lines.push(`  ${code}: ${rule}`);
    }
  }

  // Only inject coding preferences relevant to the claim's CDT codes
  const relevantPrefs = Object.entries(policy.codingPreferences).filter(([code]) =>
    cdtCodes.includes(code)
  );
  if (relevantPrefs.length > 0) {
    lines.push('\nCoding preferences/downcoding risks:');
    for (const [code, pref] of relevantPrefs) {
      lines.push(`  ${code}: ${pref}`);
    }
  }

  // Only inject documentation requirements for codes in the claim
  const relevantDocs = Object.entries(policy.documentationRequired).filter(([code]) =>
    cdtCodes.includes(code)
  );
  if (relevantDocs.length > 0) {
    lines.push('\nThis payer requires for codes in this claim:');
    for (const [code, req] of relevantDocs) {
      lines.push(`  ${code}: ${req}`);
    }
  }

  // Check for bundling warnings relevant to the claim's codes
  const relevantBundling = policy.bundlingWarnings.filter(warning =>
    cdtCodes.some(code => warning.includes(code))
  );
  if (relevantBundling.length > 0) {
    lines.push('\n⚠ BUNDLING WARNINGS:');
    for (const warning of relevantBundling) {
      lines.push(`  • ${warning}`);
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

function buildDiagnosisSection(diagnosisCodes: string[], cdtCodes: string[]): string {
  if (diagnosisCodes.length === 0) return '';

  const lines: string[] = ['DIAGNOSIS CODE ANALYSIS:'];
  let found = false;

  for (const icd of diagnosisCodes) {
    const entry = ICD10_SUPPORT[icd];
    if (!entry) continue;

    // Check if this diagnosis supports any of the billed CDT codes
    const supported = entry.supports.filter(code => cdtCodes.includes(code));
    const unsupported = cdtCodes.filter(
      code => !entry.supports.includes(code) && ICD10_SUPPORT[icd] !== undefined
    );

    found = true;
    lines.push(`\n${icd} — ${entry.description}`);
    if (supported.length > 0) {
      lines.push(`  ✓ Supports procedures: ${supported.join(', ')}`);
      lines.push(`  Justification: ${entry.justification}`);
    }

    // Flag CDT codes in the claim that this diagnosis does NOT support
    const unsupportedByCodes = cdtCodes.filter(code => !entry.supports.includes(code));
    if (unsupportedByCodes.length > 0 && supported.length === 0) {
      lines.push(`  ⚠ This diagnosis does not directly support: ${unsupportedByCodes.join(', ')} — additional or alternative diagnosis codes may be needed`);
    }
  }

  // Flag CDT codes that have no matching diagnosis support
  const codesWithSupport = new Set<string>();
  for (const icd of diagnosisCodes) {
    const entry = ICD10_SUPPORT[icd];
    if (entry) entry.supports.forEach(code => codesWithSupport.add(code));
  }
  const unsupportedCodes = cdtCodes.filter(code => CDT_CODES[code] && !codesWithSupport.has(code));
  if (unsupportedCodes.length > 0) {
    lines.push(`\n⚠ MISSING DIAGNOSIS SUPPORT: ${unsupportedCodes.join(', ')} — no billed diagnosis code confirms medical necessity for these procedures`);
  }

  return found ? lines.join('\n') : '';
}

function buildGuidelinesSection(cdtCodes: string[]): string {
  const guidelineKeys = new Set<string>();

  for (const code of cdtCodes) {
    const keys = CDT_TO_GUIDELINE_MAP[code] || [];
    keys.forEach(k => guidelineKeys.add(k));
  }

  if (guidelineKeys.size === 0) return '';

  const lines: string[] = ['CLINICAL GUIDELINES (cite these in analysis and appeals):'];

  for (const key of guidelineKeys) {
    const guideline = CLINICAL_GUIDELINES[key];
    if (!guideline) continue;

    lines.push(`\n${guideline.title}`);
    lines.push(`Source: ${guideline.source}`);
    lines.push(guideline.content);
  }

  return lines.join('\n');
}

function buildAppealTipsSection(payerId: string, denialReason: string): string {
  const policy = PAYER_POLICIES[payerId];
  if (!policy || policy.appealTips.length === 0) return '';

  const lowerReason = denialReason.toLowerCase();

  // Try to find the most relevant tips based on the denial reason
  const relevantTips = policy.appealTips.filter(tip => {
    const lowerTip = tip.toLowerCase();
    if (lowerReason.includes('frequency') && lowerTip.includes('frequency')) return true;
    if (lowerReason.includes('medically necessary') && lowerTip.includes('medically necessary')) return true;
    if (lowerReason.includes('medical necessity') && lowerTip.includes('necessary')) return true;
    if (lowerReason.includes('downcode') && lowerTip.includes('downcode')) return true;
    if (lowerReason.includes('documentation') && lowerTip.includes('documentation')) return true;
    if (lowerReason.includes('bundl') && lowerTip.includes('bundl')) return true;
    return false;
  });

  // If no specific match, include all tips
  const tipsToShow = relevantTips.length > 0 ? relevantTips : policy.appealTips;

  const lines = ['PAYER-SPECIFIC APPEAL STRATEGY:'];
  for (const tip of tipsToShow) {
    lines.push(`  • ${tip}`);
  }

  return lines.join('\n');
}
