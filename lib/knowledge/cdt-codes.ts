export interface CdtCodeEntry {
  description: string;
  requiredDocs: string[];
  bundlingConflicts: string[];
  frequencyLimit: string;
  preAuthRequired: boolean;
  supportingDiagnoses: string[];
}

export const CDT_CODES: Record<string, CdtCodeEntry> = {
  D0120: {
    description: 'Periodic oral evaluation — established patient',
    requiredDocs: [
      'Patient chart with previous visit history',
      'Clinical notes documenting findings',
    ],
    bundlingConflicts: ['D0150', 'D0180'],
    frequencyLimit: 'Twice per year (every 6 months)',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
  },
  D0210: {
    description: 'Complete series of radiographic images (full mouth X-rays)',
    requiredDocs: [
      'Clinical indication documented in chart',
      'Previous FMX date must be beyond frequency limit',
    ],
    bundlingConflicts: ['D0330'],
    frequencyLimit: 'Once every 3–5 years (varies by payer; Delta: 5 years, Anthem: 3 years)',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21', 'K08.9'],
  },
  D1110: {
    description: 'Prophylaxis — adult (cleaning, age 14 and older)',
    requiredDocs: [
      'Clinical notes confirming patient is not in active perio therapy',
    ],
    bundlingConflicts: ['D4341', 'D4342', 'D4910', 'D1120'],
    frequencyLimit: 'Twice per year (every 6 months)',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
  },
  D1120: {
    description: 'Prophylaxis — child (cleaning, up to age 13)',
    requiredDocs: [
      'Patient age must be under 14 at time of service',
      'Clinical notes confirming no active perio disease',
    ],
    bundlingConflicts: ['D4341', 'D4342', 'D4910', 'D1110'],
    frequencyLimit: 'Twice per year (every 6 months)',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
  },
  D2140: {
    description: 'Amalgam restoration — one surface, primary or permanent',
    requiredDocs: [
      'Radiograph showing carious lesion or fracture',
      'Clinical notes documenting lesion size and location',
      'Tooth number must be documented',
    ],
    bundlingConflicts: ['D2150', 'D2160', 'D2161'],
    frequencyLimit: 'No frequency limit; replacement typically requires 5-year waiting period per tooth',
    preAuthRequired: false,
    supportingDiagnoses: ['K02.9', 'K02.51', 'K02.52', 'K02.53', 'K02.61', 'K02.62', 'K02.63'],
  },
  D2740: {
    description: 'Crown — porcelain/ceramic substrate (all-ceramic crown)',
    requiredDocs: [
      'Pre-operative periapical or bitewing X-ray within 12 months',
      'Written narrative explaining why crown is necessary vs. alternative restorations',
      'Documentation of existing tooth structure loss or fracture',
      'Pre-authorization if required by payer',
    ],
    bundlingConflicts: ['D2750', 'D2751', 'D2752'],
    frequencyLimit: '5-year replacement limitation (some payers 7 years)',
    preAuthRequired: true,
    supportingDiagnoses: ['K02.9', 'K08.81', 'K08.89', 'S02.5XXA', 'K04.0', 'K04.1'],
  },
  D2750: {
    description: 'Crown — porcelain fused to high noble metal (PFM crown)',
    requiredDocs: [
      'Pre-operative periapical X-ray within 12 months',
      'Clinical notes documenting crown necessity',
      'Tooth number and surface documented',
    ],
    bundlingConflicts: ['D2740', 'D2751', 'D2752'],
    frequencyLimit: '5-year replacement limitation (some payers 7 years)',
    preAuthRequired: true,
    supportingDiagnoses: ['K02.9', 'K08.81', 'K08.89', 'S02.5XXA', 'K04.0', 'K04.1'],
  },
  D4341: {
    description: 'Periodontal scaling and root planing — 4 or more teeth per quadrant',
    requiredDocs: [
      '6-point periodontal chart dated within 6 months of service',
      'Probing depths ≥4mm documented in at least 2 sites per tooth treated',
      'Radiographic evidence of bone loss (bitewing or periapical X-rays)',
      'Clinical notes documenting active periodontal disease',
    ],
    bundlingConflicts: ['D1110', 'D1120', 'D4910', 'D4342'],
    frequencyLimit: '2 quadrants per 24-month period (standard PPO); some payers allow once per 24 months total',
    preAuthRequired: false,
    supportingDiagnoses: ['K05.2', 'K05.3', 'K05.30', 'K05.31', 'K05.311', 'K05.312', 'K05.319', 'K05.32'],
  },
  D4342: {
    description: 'Periodontal scaling and root planing — 1 to 3 teeth per quadrant',
    requiredDocs: [
      '6-point periodontal chart dated within 6 months of service',
      'Probing depths ≥4mm for affected teeth',
      'Radiographic evidence of localized bone loss',
    ],
    bundlingConflicts: ['D1110', 'D1120', 'D4910', 'D4341'],
    frequencyLimit: 'Same quadrant: 24 months',
    preAuthRequired: false,
    supportingDiagnoses: ['K05.2', 'K05.3', 'K05.30', 'K05.31', 'K05.311'],
  },
  D4910: {
    description: 'Periodontal maintenance (perio recall after active therapy)',
    requiredDocs: [
      'Documentation that patient completed prior SRP (D4341 or D4342)',
      'Current periodontal chart showing maintenance status',
      'Clinical notes confirming patient is in perio maintenance phase',
    ],
    bundlingConflicts: ['D1110', 'D1120', 'D4341', 'D4342'],
    frequencyLimit: 'Every 3–4 months for active perio; every 6 months for stable maintenance (payer-dependent)',
    preAuthRequired: false,
    supportingDiagnoses: ['K05.30', 'K05.31', 'K05.32', 'Z29.8'],
  },
  D6010: {
    description: 'Surgical placement of implant body (endosseous implant)',
    requiredDocs: [
      'Radiograph of failed/missing tooth (pre-extraction or post-extraction)',
      'CBCT scan if available',
      'Implant justification letter explaining why implant is preferred over alternatives',
      'Documentation of alternatives considered (bridge, partial denture)',
      'Medical history relevant to implant candidacy (bone density, systemic conditions)',
    ],
    bundlingConflicts: ['D6065', 'D6066'],
    frequencyLimit: 'One implant per missing tooth site; waiting periods vary by payer (6–12 months post-extraction)',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.101', 'K08.102', 'K08.109', 'K08.401', 'K08.402', 'K08.409'],
  },
  D6065: {
    description: 'Implant supported porcelain/ceramic crown',
    requiredDocs: [
      'Documentation that implant (D6010) is osseointegrated and restored',
      'Periapical X-ray showing implant integration',
      'Implant placement records',
    ],
    bundlingConflicts: ['D6010', 'D6066'],
    frequencyLimit: '5-year replacement limitation',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.101', 'K08.102', 'K08.409'],
  },
  D6066: {
    description: 'Implant supported crown — porcelain fused to predominantly base alloy',
    requiredDocs: [
      'Documentation that implant is osseointegrated',
      'Periapical X-ray showing implant integration',
      'Implant placement records',
    ],
    bundlingConflicts: ['D6010', 'D6065'],
    frequencyLimit: '5-year replacement limitation',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.101', 'K08.102', 'K08.409'],
  },
  D7140: {
    description: 'Extraction, erupted tooth or exposed root (simple extraction)',
    requiredDocs: [
      'Radiograph showing tooth to be extracted',
      'Clinical notes documenting reason for extraction',
      'Tooth number documented',
    ],
    bundlingConflicts: ['D7210', 'D7240'],
    frequencyLimit: 'No frequency limit',
    preAuthRequired: false,
    supportingDiagnoses: ['K08.419', 'K08.429', 'K02.9', 'K04.0', 'K04.1', 'K08.1'],
  },
  D7210: {
    description: 'Extraction, erupted tooth requiring removal of bone and/or sectioning (surgical extraction)',
    requiredDocs: [
      'Periapical X-ray showing impaction or anatomical complexity',
      'Clinical notes documenting surgical necessity',
      'Tooth number and reason for surgical vs. simple approach',
    ],
    bundlingConflicts: ['D7140', 'D7240'],
    frequencyLimit: 'No frequency limit',
    preAuthRequired: false,
    supportingDiagnoses: ['K08.419', 'K08.429', 'K01.1', 'K08.1'],
  },
  D7240: {
    description: 'Removal of impacted tooth — completely bony, with or without space for eruption',
    requiredDocs: [
      'Panoramic or periapical X-ray showing full bony impaction',
      'Clinical notes documenting impaction depth and angulation',
      'Patient age and eruption status documented',
      'Pre-authorization for most payers',
    ],
    bundlingConflicts: ['D7140', 'D7210'],
    frequencyLimit: 'Once per tooth (permanent teeth); no repeat billing',
    preAuthRequired: true,
    supportingDiagnoses: ['K01.1', 'K01.0'],
  },
};
