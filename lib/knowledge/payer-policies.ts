export interface PayerPolicy {
  frequencyRules: Record<string, string>;
  codingPreferences: Record<string, string>;
  documentationRequired: Record<string, string>;
  bundlingWarnings: string[];
  appealTips: string[];
}

// Keyed by the payerId stored in the Payer table seed data
export const PAYER_POLICIES: Record<string, PayerPolicy> = {
  DELTA001: {
    frequencyRules: {
      D0120: 'Every 6 months (2x/year); claims within 152 days of previous visit are denied',
      D0210: 'Once every 5 years',
      D1110: 'Every 6 months (2x/year)',
      D1120: 'Every 6 months (2x/year)',
      D4910: 'Every 3–4 months for active perio phase; every 6 months once stabilized',
      D2740: '5-year replacement limitation per tooth',
      D2750: '5-year replacement limitation per tooth',
    },
    codingPreferences: {
      D2740: 'Delta Dental frequently downcodes all-ceramic (D2740) to PFM (D2750); include X-ray and narrative to support all-ceramic necessity',
      D4341: 'Delta requires probing depths ≥4mm documented — vague "perio disease" notes will trigger denial',
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
    ],
    appealTips: [
      'Frequency limit denials: attach ADA clinical guideline reference + chart notes showing medical necessity for early recare',
      'Not medically necessary (crown): include pre-op X-ray + narrative describing tooth structure loss percentage',
      'Downcode disputes (D2740→D2750): cite ADA guideline that all-ceramic is standard of care for anterior teeth; include clinical photo',
      'Perio frequency denials: attach updated periodontal chart showing active disease markers',
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
      'Frequency overrides: document acute exacerbation or new systemic condition affecting oral health',
      'Not medically necessary: include full clinical documentation and ADA guidelines supporting treatment',
      'Bundling disputes: itemize each procedure with distinct clinical notes showing separate clinical necessity',
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
      'Coverage denials: request plan summary documents; verify benefit year and waiting periods',
      'Frequency limit: submit clinical documentation of acute need; cite medical necessity with supporting lab or imaging',
      'Implant denials: detailed narrative with AAP/ADA guideline citations; emphasize functional necessity',
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
      'Benefit maximum reached: appeal to plan administrator; include hardship documentation if applicable',
      'Not medically necessary for crown: detailed X-ray + narrative showing >50% structure loss or fracture risk',
      'Perio frequency: attach updated chart showing active disease and specialist recommendation',
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
  },
};
