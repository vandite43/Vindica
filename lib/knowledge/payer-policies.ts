export interface PayerPolicy {
  frequencyRules: Record<string, string>;
  codingPreferences: Record<string, string>;
  documentationRequired: Record<string, string>;
  bundlingWarnings: string[];
  appealTips: string[];
  timelyFiling?: string;
  appealWindow?: string;
  behaviorNotes?: string[];
}

// Keyed by the payerId stored in the Payer table seed data
export const PAYER_POLICIES: Record<string, PayerPolicy> = {
  DELTA001: {
    frequencyRules: {
      D0120: 'Every 6 months (2x/year); claims within 152 days of previous visit are denied',
      D0210: 'Once every 5 years strictly — most aggressive FMX frequency enforcement of any major payer',
      D1110: 'Every 6 months (2x/year)',
      D1120: 'Every 6 months (2x/year)',
      D4910: 'Every 3–4 months for active perio phase; every 6 months once stabilized',
      D2740: '5-year replacement limitation per tooth',
      D2750: '5-year replacement limitation per tooth',
    },
    codingPreferences: {
      D2740: 'Delta Dental frequently downcodes all-ceramic (D2740) to PFM (D2750); include X-ray and narrative to support all-ceramic necessity',
      D4341: 'Delta requires probing depths ≥4mm documented — vague "perio disease" notes will trigger denial',
      D2392: 'Delta applies LEAT — pays posterior composites at amalgam rate (D2150)',
    },
    documentationRequired: {
      D2740: 'Periapical X-ray within 12 months + written narrative explaining why all-ceramic crown is necessary over PFM',
      D2750: 'Periapical X-ray within 12 months + clinical notes showing crown necessity',
      D6010: 'Implant justification letter, failed tooth radiograph, CBCT if available, list of alternatives considered',
      D4341: 'Full 6-point periodontal chart; probing depths ≥4mm in at least 2 sites per tooth; bone loss visible on X-ray',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed on the same date of service',
      'D4342 and D4910 cannot be billed same quadrant same date',
      'D2140–D2161: if more than 3 surfaces on same tooth, use D2160 or D2161 instead',
      'D0120 and D0150 cannot be billed same date',
      'CRITICAL: Billing 6+ periapical films (D0220/D0230) plus bitewings on the same date triggers automatic FMX (D0210) reclassification by Delta — starts the 5-year frequency clock even if D0210 was not billed',
    ],
    appealTips: [
      'Frequency limit denials: attach ADA clinical guideline reference + chart notes showing medical necessity for early recare',
      'Not medically necessary (crown): include pre-op X-ray + narrative describing tooth structure loss percentage',
      'Downcode disputes (D2740→D2750): cite ADA guideline that all-ceramic is standard of care for anterior teeth; include clinical photo',
      'Perio frequency denials: attach updated periodontal chart showing active disease markers',
      'Appeal window: 180 days first appeal, 60 days second appeal',
    ],
    timelyFiling: '12–18 months (varies by state affiliate — verify your specific Delta company)',
    appealWindow: '180 days first appeal; 60 days second appeal',
    behaviorNotes: [
      'Delta Dental has 39 independent regional affiliates — must submit to patient\'s specific Delta company',
      '#1 denial trigger: frequency limitations (Code 222)',
      'Aggressively bundles periapical films into FMX reclassification',
      'Some affiliates do NOT honor assignment of benefits for non-participating dentists — payment may go directly to patient',
    ],
  },
  ANTHEM001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3 years',
      D1110: 'Every 6 months',
      D4910: 'Every 3 months for active perio; 6 months maintenance',
      D2740: '7-year replacement limitation',
      D2750: '7-year replacement limitation',
    },
    codingPreferences: {
      D4341: 'Anthem requires probing depths documented per tooth, not just per quadrant',
      D6010: 'Anthem BCBS often denies implants as "not medically necessary" without detailed clinical narrative',
    },
    documentationRequired: {
      D2740: 'Periapical X-ray within 12 months; narrative required for anterior teeth; pre-auth required for posterior crowns >$500',
      D6010: 'Pre-auth mandatory; include bone density assessment, treatment alternatives, failed tooth X-ray series',
      D7240: 'Panoramic X-ray showing complete bony impaction; pre-auth required',
      D4341: 'Full periodontal chart with per-tooth probing depths; bone loss radiographs; medical history for systemic contributors',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same visit',
      'D1110 and D4910 cannot be billed same visit',
      'Anthem frequently audits claims with D6010 + D6065 billed within same year — ensure osseointegration period is documented',
    ],
    appealTips: [
      'Pre-auth denied for crown: submit clinical photos + X-ray + written statement that tooth cannot be restored with filling',
      'Implant denied as not medically necessary: cite ADA 2016 Evidence-Based Guideline; include failed tooth history and alternatives rejected with clinical rationale',
      'Frequency limit override: submit clinical notes showing active disease requiring earlier treatment + physician/specialist recommendation',
      'ERISA plans: invoke ERISA § 503 right to full and fair review; request copy of plan documents and denial rationale within 30 days',
    ],
  },
  CIGNA001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3 years',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months',
      D2740: '5-year replacement limitation',
    },
    codingPreferences: {
      D2740: 'Cigna covers all-ceramic crowns at parity with PFM for most plans; verify plan documents',
      D4341: 'Cigna accepts probing depths ≥4mm per standard; documentation of bone loss on X-ray strengthens claim',
      D2392: 'Cigna applies LEAT — pays posterior composites at amalgam rate (D2150)',
      D7210: 'Cigna frequently downcodes surgical extractions to simple (D7140) — document flap elevation, bone removal, or sectioning explicitly',
    },
    documentationRequired: {
      D6010: 'Pre-auth required; bone graft records if applicable; CBCT preferred',
      D2740: 'X-ray within 12 months; narrative for cases with prior restoration on same tooth',
      D4341: 'Periodontal chart; X-rays; clinical notes',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'D1110 and D4910 cannot be billed same date',
      'Cigna may bundle D2140 and D2330 if billed same tooth same date — verify restorations are distinct',
    ],
    appealTips: [
      'CALL BEFORE submitting formal appeal — many downcoded claims resolved by phone with Cigna',
      'Frequency overrides: document acute exacerbation or new systemic condition affecting oral health',
      'Not medically necessary: include full clinical documentation and ADA guidelines supporting treatment',
      'Bundling disputes: itemize each procedure with distinct clinical notes showing separate clinical necessity',
    ],
    timelyFiling: '90 days (participating) / 180 days (non-participating)',
    appealWindow: '180 days standard; 365 days for California providers',
    behaviorNotes: [
      'Systematic AI-driven downcoding — most aggressive downcode payer',
      'Posterior composites paid at amalgam rate (LEAT)',
      'Surgical extractions frequently downcoded to simple',
      'Waiting periods strictly enforced: 6 months basic, 12 months major',
      'STRATEGY: Call before formal appeal — many denials resolved by phone',
    ],
  },
  AETNA001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3 years',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months',
      D2740: '5-year replacement limitation',
      D2750: '5-year replacement limitation',
    },
    codingPreferences: {
      D2740: 'Aetna may downcode to D2750 for posterior teeth; include clinical justification for all-ceramic in posterior',
      D6010: 'Aetna requires implant pre-auth with detailed radiographic evidence',
      D2392: 'Aetna applies LEAT — pays posterior composites at amalgam rate',
      D7210: 'Aetna explicitly states periodontally involved teeth with bone loss = routine removal — document surgical elements (flap, bone removal, sectioning) explicitly regardless of perio status',
      D2750: 'Aetna frequently pays high noble crowns at base metal rate without lab receipt — always attach lab slip',
    },
    documentationRequired: {
      D6010: 'Pre-auth required; extraction records; 3-month healing period documentation; CBCT or panoramic X-ray',
      D2740: 'Periapical X-ray; narrative for posterior all-ceramic; prior auth for high-cost plans',
      D4341: 'Full perio chart; probing depths; X-rays showing bone loss',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'D4910 and D1110 cannot be billed same date',
      'Aetna flags D0210 billed within 24 months of prior FMX — include clinical justification',
    ],
    appealTips: [
      'Request peer-to-peer with dental consultant BEFORE submitting formal appeal. Fax: 1-877-867-8729',
      'Coverage denials: request plan summary documents; verify benefit year and waiting periods',
      'Frequency limit: submit clinical documentation of acute need; cite medical necessity with supporting lab or imaging',
      'Implant denials: detailed narrative with AAP/ADA guideline citations; emphasize functional necessity',
      'Silent downcoding: monitor every ERA against expected amounts — Aetna reduces payments without formal denial notices',
    ],
    timelyFiling: '90 days (participating)',
    appealWindow: '180 days',
    behaviorNotes: [
      '"Claim and Code Review Program" produces avg 6.4% cost reduction on claims',
      'Silent downcoding — payments reduced without formal denial notices. Monitor every ERA against expected amounts.',
      'Aggressive LEAT provisions on posterior composites',
      'Peer-to-peer with dental consultant available BEFORE formal appeal — fax 1-877-867-8729',
    ],
  },
  UCONCORDIA001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3 years',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months active perio; every 6 months maintenance',
      D2740: '5-year replacement',
    },
    codingPreferences: {
      D4341: 'United Concordia requires quadrant designation in claim; missing quadrant field triggers auto-denial',
    },
    documentationRequired: {
      D4341: 'Perio chart; quadrant designation required; probing depths per tooth',
      D2740: 'X-ray and narrative; pre-auth for high-value plans',
      D6010: 'Pre-auth mandatory; full radiographic series',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'D4910 and D1110 cannot be billed same date',
    ],
    appealTips: [
      'Missing information denials: resubmit with complete quadrant and tooth number fields',
      'Not medically necessary: attach periodontal chart with probing depths highlighted',
      'Frequency denials: document medical necessity with clinical notes showing disease progression',
    ],
  },
  METLIFE001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3–5 years (plan-dependent)',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months',
      D2740: '5-year replacement',
      D2750: '5-year replacement',
    },
    codingPreferences: {
      D2750: 'MetLife generally covers PFM; all-ceramic may require additional documentation',
      D4341: 'MetLife requires bone loss evidence on X-ray in addition to probing depths',
    },
    documentationRequired: {
      D2740: 'X-ray within 12 months; narrative; pre-auth for most plans',
      D4341: 'Full perio chart + radiographic bone loss evidence',
      D6010: 'Pre-auth required; post-extraction healing documentation',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'D1110 and D4910 cannot be billed same date',
    ],
    appealTips: [
      'CRITICAL: Appeals must be submitted in WRITING ONLY — no phone or electronic appeals accepted by MetLife',
      'Benefit maximum reached: appeal to plan administrator; include hardship documentation if applicable',
      'Not medically necessary for crown: detailed X-ray + narrative showing >50% structure loss or fracture risk',
      'Perio frequency: attach updated chart showing active disease and specialist recommendation',
      'MetLife processes appeal decisions within 30 days of written submission',
    ],
    timelyFiling: '12 months',
    appealWindow: '180 days; decision within 30 days of written submission',
    behaviorNotes: [
      'Most straightforward major payer — moderate downcoding, predictable behavior',
      'Processing: 14 business days',
      'APPEALS IN WRITING ONLY — no phone or electronic appeals accepted',
    ],
  },
  GUARDIAN001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3 years',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months',
      D2740: '5-year replacement',
    },
    codingPreferences: {
      D2740: 'Guardian covers all-ceramic for anterior; posterior all-ceramic may be downgraded to alternate benefit',
      D6010: 'Guardian often covers implants under major services; verify benefit class',
    },
    documentationRequired: {
      D6010: 'Pre-auth required; full radiographic record; extraction to implant timeline',
      D2740: 'X-ray; clinical narrative; anterior vs. posterior designation important',
      D4341: 'Complete perio chart; probing depths; X-rays',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'Guardian may apply alternate benefit (D2750) for posterior D2740 — document clinical rationale for all-ceramic',
    ],
    appealTips: [
      'Alternate benefit applied (D2740→D2750): submit clinical photos and ADA guideline reference for posterior all-ceramic',
      'Implant not covered: verify plan documents; many Guardian plans added implant coverage post-2018',
      'Frequency denial: medical necessity letter + chart notes',
    ],
    timelyFiling: '180 days',
    appealWindow: 'Standard process',
    behaviorNotes: [
      'Generally considered fair and straightforward by billing specialists',
      'Predictable fee schedule behavior',
      'Processing: 10–15 business days',
      'One of the lower-difficulty payers',
    ],
  },
  HUMANA001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3 years',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months',
      D2740: '7-year replacement limitation',
      D2750: '7-year replacement limitation',
    },
    codingPreferences: {
      D4341: 'Humana requires clinical attachment level loss documented in addition to probing depths',
      D6010: 'Humana has strict implant criteria; single-tooth replacement for specific tooth types only under some plans',
      D2392: 'Humana applies LEAT — pays posterior composites at amalgam rate',
    },
    documentationRequired: {
      D6010: 'Pre-auth mandatory; bone graft documentation if applicable; CBCT preferred; systemic health clearance',
      D2740: 'X-ray; narrative; pre-auth for plans with high major service deductible',
      D4341: 'Full perio chart with attachment levels; radiographic bone loss; systemic disease documentation if applicable',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'D4910 and D1110 cannot be billed same date',
      'Humana may deny D4910 if prior SRP (D4341) not on record with Humana — include SRP records if done by prior provider',
    ],
    appealTips: [
      'SRP history not on file: attach prior provider records showing completed D4341 treatment',
      'Implant denied: detailed clinical narrative citing ADA guideline; functional assessment; quality of life documentation',
      'Frequency limit: submit updated periodontal chart showing active disease + specialist (periodontist) referral recommendation',
    ],
    timelyFiling: '180 days',
    appealWindow: 'Standard process',
    behaviorNotes: [
      'Has acknowledged downcoding alongside Cigna and Aetna',
      'Applies LEAT provisions on posterior composites',
      'Similar documentation requirements to Cigna',
    ],
  },

  UNITED001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3–5 years (plan-dependent)',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months',
      D2740: '5-year replacement limitation',
    },
    codingPreferences: {
      D7210: 'UHC requires explicit surgical documentation for D7210 — without flap, bone removal, or sectioning noted, will downcode to D7140',
    },
    documentationRequired: {
      D6010: 'Pre-auth required; comprehensive radiographic series; CBCT preferred',
      D2740: 'Periapical X-ray; narrative; pre-auth for plans over threshold amount',
      D4341: 'Full perio chart; probing depths; radiographic bone loss',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'D4910 and D1110 cannot be billed same date',
    ],
    appealTips: [
      'CRITICAL PROCESS: Reconsideration FIRST (only one reconsideration allowed), then formal appeal if denied. Do NOT skip reconsideration.',
      'Include all clinical documentation not in original submission',
      'Reference UHC medical necessity criteria specific to the procedure',
    ],
    timelyFiling: '90–180 days (plan-dependent)',
    appealWindow: '120–180 days by plan',
    behaviorNotes: [
      'Payer ID 52133 — verify on every claim submission',
      'Strict documentation requirements',
      'Two-step appeal process: Reconsideration FIRST (one allowed), then formal appeal — do NOT skip reconsideration',
    ],
  },

  BCBS001: {
    frequencyRules: {
      D0120: 'Every 6 months',
      D0210: 'Once every 3–5 years (varies by state affiliate)',
      D1110: 'Every 6 months',
      D4910: 'Every 3–4 months',
      D2740: '5–7 year replacement limitation (varies by state affiliate)',
    },
    codingPreferences: {
      D4341: 'BCBS requirements vary significantly by state affiliate — document comprehensively',
    },
    documentationRequired: {
      D6010: 'Pre-auth required; clinical justification; radiographic evidence',
      D2740: 'Periapical X-ray; narrative; pre-auth per plan requirements',
      D4341: 'Full perio chart; probing depths; bone loss X-rays',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
      'D4910 and D1110 cannot be billed same date',
    ],
    appealTips: [
      'Behavior varies significantly by state affiliate — obtain state-specific appeal guidelines',
      'Include full clinical documentation with any appeal',
      'ERISA language applicable for employer-sponsored plans',
    ],
    timelyFiling: '365 days typical (varies significantly by state affiliate)',
    appealWindow: 'Varies by state affiliate',
    behaviorNotes: [
      'Varies significantly by state affiliate — policies and processing differ substantially',
      'Generally 365 days timely filing but verify your specific affiliate',
    ],
  },

  MEDICAID001: {
    frequencyRules: {
      D0120: 'Varies by state — typically every 6 months',
      D1110: 'Varies by state — typically every 6 months',
      D4341: 'Prior authorization required in most states',
    },
    codingPreferences: {
      D4341: 'Many state Medicaid programs have limited or no periodontal coverage — verify state coverage',
    },
    documentationRequired: {
      D6010: 'Prior authorization mandatory; many states exclude implants entirely',
      D4341: 'Prior authorization required; full clinical documentation',
      D7210: 'Documentation of surgical necessity; some states require prior auth',
    },
    bundlingWarnings: [
      'D4341 and D1110 cannot be billed same date',
    ],
    appealTips: [
      'Medicaid appeals must comply with state-specific administrative hearing process',
      'Include ICD-10 diagnosis codes — increasingly mandatory alongside CDT codes',
      'Appeal timelines are state-specific — know your state deadline',
    ],
    timelyFiling: '90 days to 12 months (state-dependent — know your specific state deadline)',
    appealWindow: 'State-specific administrative process',
    behaviorNotes: [
      'CRITICAL: Balance billing patients is ILLEGAL — cannot bill patients for amounts above Medicaid fee',
      'Reimbursement averages 29.9% of average dentist charges nationally',
      'Prior authorization required for many services — verify before every major procedure',
      'ICD-10 diagnosis codes increasingly mandatory alongside CDT codes',
      'Coverage: mandatory for children under EPSDT; optional for adults (38 states + DC offer enhanced adult dental benefits)',
      'Only 41% of US dentists participate nationally',
    ],
  },
};
