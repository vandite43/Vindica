export interface CdtCodeEntry {
  description: string;
  denialRisk: 'Low' | 'Medium' | 'High' | 'Very High';
  requiredDocs: string[];
  bundlingConflicts: string[];
  frequencyLimit: string;
  preAuthRequired: boolean;
  supportingDiagnoses: string[];
  criticalNotes?: string[];
}

export const CDT_CODES: Record<string, CdtCodeEntry> = {
  D0120: {
    description: 'Periodic oral evaluation — established patient',
    denialRisk: 'Low',
    requiredDocs: [
      'Patient chart with previous visit history',
      'Clinical notes documenting findings',
    ],
    bundlingConflicts: ['D0140', 'D0150', 'D0180'],
    frequencyLimit: 'Twice per year (every 6 months) — all payers',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
    criticalNotes: [
      'Do NOT bill for new patients — use D0150 for new patients',
      'Cannot bill same day as D0140 or D0150',
    ],
  },

  D0140: {
    description: 'Limited oral evaluation — problem-focused',
    denialRisk: 'Low',
    requiredDocs: [
      'Clinical notes documenting the specific problem evaluated',
      'Chief complaint or reason for limited visit',
    ],
    bundlingConflicts: ['D0120', 'D0150'],
    frequencyLimit: 'No specific frequency limit; payers flag patterns of repeated D0140 billing to avoid D0120 frequency limits',
    preAuthRequired: false,
    supportingDiagnoses: ['K08.9', 'K04.0', 'K04.1', 'S02.5XXA'],
    criticalNotes: [
      'Cannot bill same day as D0120 or D0150',
      'ABUSE FLAG: Using D0140 repeatedly instead of D0120 to dodge frequency limits is flagged by payers as abuse pattern',
    ],
  },

  D0150: {
    description: 'Comprehensive oral evaluation — new or established patient',
    denialRisk: 'Low',
    requiredDocs: [
      'Complete medical and dental history',
      'Clinical notes documenting full examination findings',
    ],
    bundlingConflicts: ['D0120', 'D0140'],
    frequencyLimit: 'Once per new patient; once every 3 years for established patients (most payers)',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
    criticalNotes: [
      'Cannot bill same day as D0120 or D0140',
      'Billing D0150 for established patient at routine recall = denial — use D0120',
    ],
  },

  D0210: {
    description: 'Complete series of radiographic images (full mouth X-rays / FMX)',
    denialRisk: 'Medium',
    requiredDocs: [
      'Clinical indication documented in chart',
      'Previous FMX date must be beyond frequency limit',
    ],
    bundlingConflicts: ['D0220', 'D0230', 'D0330'],
    frequencyLimit: 'Delta Dental: once every 5 years strictly. Cigna/Aetna: 3–5 years. Most others: 3–5 years.',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21', 'K08.9'],
    criticalNotes: [
      'CRITICAL BUNDLING TRAP: Billing 6+ periapical films (D0220/D0230) combined with bitewings on the same date triggers automatic FMX reclassification by Delta and other payers — starts the 3-5 year frequency clock even if D0210 was never intentionally billed',
      'Some payers deny D0330 same day as D0210',
    ],
  },

  D0220: {
    description: 'Periapical radiographic image — first image',
    denialRisk: 'Medium',
    requiredDocs: ['Clinical indication for periapical view'],
    bundlingConflicts: ['D0210'],
    frequencyLimit: 'No specific frequency limit per image; watch for FMX reclassification trigger',
    preAuthRequired: false,
    supportingDiagnoses: ['K04.0', 'K04.1', 'K08.9', 'Z01.20'],
    criticalNotes: [
      'WATCH: 6+ periapical films combined with bitewing series on same date may trigger automatic FMX (D0210) reclassification by payer — starts 3-5 year frequency clock',
    ],
  },

  D0230: {
    description: 'Periapical radiographic image — each additional image',
    denialRisk: 'Medium',
    requiredDocs: ['Clinical indication for additional periapical views'],
    bundlingConflicts: ['D0210'],
    frequencyLimit: 'No specific frequency limit; watch for FMX reclassification trigger',
    preAuthRequired: false,
    supportingDiagnoses: ['K04.0', 'K04.1', 'K08.9'],
    criticalNotes: [
      'WATCH: Combined with D0220 and bitewings — if 6+ periapicals total billed with bitewings, payer may reclassify entire series as D0210 FMX',
    ],
  },

  D0272: {
    description: 'Bitewing radiographic image — two images',
    denialRisk: 'Low',
    requiredDocs: ['Clinical indication documented'],
    bundlingConflicts: [],
    frequencyLimit: 'Delta Dental: once per year for adults. Most other payers: twice per year.',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21', 'K02.9'],
    criticalNotes: [
      'Frequency varies by payer — verify benefit year before billing second set',
    ],
  },

  D0330: {
    description: 'Panoramic radiographic image',
    denialRisk: 'Medium',
    requiredDocs: [
      'Clinical indication for panoramic view',
      'Previous panoramic date must be beyond frequency limit',
    ],
    bundlingConflicts: ['D0210'],
    frequencyLimit: 'Once every 3–5 years most payers',
    preAuthRequired: false,
    supportingDiagnoses: ['K01.1', 'K08.9', 'Z01.20'],
    criticalNotes: [
      'Some payers deny D0330 billed same day as D0210 — cannot bill both on same date',
    ],
  },

  D1110: {
    description: 'Prophylaxis — adult (cleaning, age 14 and older)',
    denialRisk: 'Low',
    requiredDocs: [
      'Clinical notes confirming patient is not in active perio therapy',
    ],
    bundlingConflicts: ['D4341', 'D4342', 'D4355', 'D4910', 'D1120'],
    frequencyLimit: 'Twice per year (every 6 months) — all payers',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
    criticalNotes: [
      'CRITICAL: Do NOT bill D1110 for patient with documented periodontal disease — must use D4910',
      'Billing D1110 for a perio patient = denial risk AND compliance violation',
      'Cannot bill same day as D4910, D4341, D4342, or D4355',
    ],
  },

  D1120: {
    description: 'Prophylaxis — child (cleaning, up to age 13)',
    denialRisk: 'Low',
    requiredDocs: [
      'Patient age must be under 14 at time of service (verify payer age cutoff)',
      'Clinical notes confirming no active perio disease',
    ],
    bundlingConflicts: ['D4341', 'D4342', 'D4910', 'D1110'],
    frequencyLimit: 'Twice per year (every 6 months)',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
    criticalNotes: [
      'Age cutoff varies by payer — some use age 13, some use 14. Always verify.',
    ],
  },

  D1206: {
    description: 'Topical application of fluoride varnish',
    denialRisk: 'Low',
    requiredDocs: ['Clinical notes documenting fluoride application'],
    bundlingConflicts: [],
    frequencyLimit: 'Twice per year most plans. Some plans limit to patients under 18.',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21', 'K02.9'],
    criticalNotes: [
      'Verify patient age eligibility — some plans restrict to under 18',
    ],
  },

  D1351: {
    description: 'Sealant — per tooth',
    denialRisk: 'Low',
    requiredDocs: [
      'Tooth number and surface documented',
      'Clinical notes confirming tooth is sealant-eligible (no prior restoration)',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'Once per tooth — most payers will not repay for 5–7 years. Some plans only cover through age 14.',
    preAuthRequired: false,
    supportingDiagnoses: ['Z01.20', 'Z01.21'],
    criticalNotes: [
      'Some plans only cover through age 14 — verify age eligibility',
      'Cannot rebill same tooth within 5-7 year window',
    ],
  },

  D2140: {
    description: 'Amalgam restoration — one surface, primary or permanent',
    denialRisk: 'Low',
    requiredDocs: [
      'Radiograph showing carious lesion or fracture',
      'Clinical notes documenting lesion size and location',
      'Tooth number must be documented',
    ],
    bundlingConflicts: ['D2150', 'D2160', 'D2161'],
    frequencyLimit: 'No frequency limit; replacement typically requires 5-year waiting period per tooth',
    preAuthRequired: false,
    supportingDiagnoses: ['K02.9', 'K02.51', 'K02.52', 'K02.53', 'K02.61', 'K02.62', 'K02.63'],
    criticalNotes: [
      'This is the LEAT downcode target — many payers pay posterior composites at this amalgam rate',
    ],
  },

  D2150: {
    description: 'Amalgam restoration — two surfaces, primary or permanent',
    denialRisk: 'Low',
    requiredDocs: [
      'Radiograph showing carious lesion',
      'Clinical notes documenting surfaces restored',
      'Tooth number and surfaces documented',
    ],
    bundlingConflicts: ['D2140', 'D2160'],
    frequencyLimit: 'No frequency limit; replacement typically requires 5-year waiting period per tooth',
    preAuthRequired: false,
    supportingDiagnoses: ['K02.9', 'K02.51', 'K02.52', 'K02.53', 'K02.61', 'K02.62', 'K02.63'],
    criticalNotes: [
      'This is the LEAT downcode target for D2392 (two-surface posterior composite) — payers paying at amalgam rate will pay this amount',
    ],
  },

  D2330: {
    description: 'Resin-based composite restoration — one surface, anterior',
    denialRisk: 'Low',
    requiredDocs: [
      'Clinical notes documenting decay or fracture',
      'Tooth number and surface documented',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'No frequency limit; replacement typically requires 5-year waiting period',
    preAuthRequired: false,
    supportingDiagnoses: ['K02.9', 'K02.51', 'K02.52', 'K02.53'],
    criticalNotes: [
      'BUNDLING: Acid etching, adhesives, and light curing are ALWAYS included — never bill separately',
    ],
  },

  D2392: {
    description: 'Resin-based composite restoration — two surfaces, posterior, primary or permanent',
    denialRisk: 'High',
    requiredDocs: [
      'Radiograph showing carious lesion',
      'Clinical notes documenting each surface individually',
      'Tooth number and all surfaces documented',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'No frequency limit per se; subject to LEAT alternative benefit',
    preAuthRequired: false,
    supportingDiagnoses: ['K02.9', 'K02.51', 'K02.52', 'K02.61', 'K02.62'],
    criticalNotes: [
      'LEAT (Least Expensive Alternative Treatment) applied by Delta Dental, Cigna, Aetna, and Humana — paid at D2150 amalgam rate',
      'In-network: must accept the lower amalgam fee',
      'Out-of-network: can bill patient the difference between composite and amalgam fee',
      'Always inform patient of LEAT BEFORE treatment — document this conversation',
      'Document each surface individually in clinical notes',
    ],
  },

  D2394: {
    description: 'Resin-based composite restoration — four or more surfaces, posterior, primary or permanent',
    denialRisk: 'High',
    requiredDocs: [
      'Radiograph showing carious lesion',
      'Clinical notes documenting every surface individually',
      'Tooth number and all surfaces documented',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'No frequency limit per se; subject to LEAT alternative benefit',
    preAuthRequired: false,
    supportingDiagnoses: ['K02.9', 'K02.51', 'K02.52', 'K02.61', 'K02.62'],
    criticalNotes: [
      'Same LEAT rules as D2392 — paid at amalgam rate by Delta, Cigna, Aetna, Humana',
      'Document every surface individually',
      'Inform patient of LEAT before treatment',
    ],
  },

  D2740: {
    description: 'Crown — porcelain/ceramic substrate (all-ceramic crown)',
    denialRisk: 'High',
    requiredDocs: [
      'Pre-operative periapical radiograph',
      'Clinical notes documenting necessity',
      'Tooth number',
      'Written narrative when decay not visible on X-ray',
    ],
    bundlingConflicts: ['D2750', 'D2751', 'D2752'],
    frequencyLimit: 'Once per tooth every 5 years most payers. Some plans: 7–10 years.',
    preAuthRequired: true,
    supportingDiagnoses: ['K02.9', 'K08.81', 'K08.89', 'S02.5XXA', 'K04.0', 'K04.1'],
    criticalNotes: [
      'Strongly recommended: intraoral photos with annotations, clinical narrative when decay not visible on X-ray',
      'Bundling: D2950 core buildup frequently bundled — requires separate retention narrative to unbundle',
    ],
  },

  D2750: {
    description: 'Crown — porcelain fused to high noble metal (PFM crown)',
    denialRisk: 'High',
    requiredDocs: [
      'Pre-operative periapical radiograph',
      'Clinical notes documenting crown necessity',
      'Tooth number and surface documented',
      'LAB RECEIPT CONFIRMING HIGH NOBLE ALLOY COMPOSITION — REQUIRED',
    ],
    bundlingConflicts: ['D2740', 'D2751', 'D2752'],
    frequencyLimit: '5-year replacement limitation (some payers 7 years)',
    preAuthRequired: true,
    supportingDiagnoses: ['K02.9', 'K08.81', 'K08.89', 'S02.5XXA', 'K04.0', 'K04.1'],
    criticalNotes: [
      'CRITICAL: Lab receipt confirming high noble alloy composition is REQUIRED. Without it, every major payer automatically downcodes to D2751 (base metal). This is the most preventable downcode in dental billing.',
      'Always attach the lab slip confirming alloy content — do not submit without it',
    ],
  },

  D2950: {
    description: 'Core buildup, including any pins when required',
    denialRisk: 'Very High',
    requiredDocs: [
      'Narrative explicitly stating buildup is for crown retention purposes',
      'Documentation that insufficient tooth structure remained after caries removal',
      'Reference to the crown procedure being supported',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'No standard frequency limit; tied to crown procedure',
    preAuthRequired: false,
    supportingDiagnoses: ['K02.9', 'K08.81', 'K08.89'],
    criticalNotes: [
      'Most bundled restorative code — highest denial rate of any restorative procedure',
      'Narrative is NON-NEGOTIABLE and always required',
      'Common mistake: narrative describes decay removal without explaining why retention form required the buildup — this triggers denial',
      'Narrative must explicitly state: (1) buildup is for crown retention, (2) insufficient tooth structure remained after preparation',
    ],
  },

  D3120: {
    description: 'Pulp capping — indirect (without removal of pulp)',
    denialRisk: 'High',
    requiredDocs: [
      'Clinical notes documenting indirect pulp cap',
      'Radiograph showing proximity of decay to pulp',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'No standard frequency limit',
    preAuthRequired: false,
    supportingDiagnoses: ['K04.01', 'K04.02', 'K02.9'],
    criticalNotes: [
      'BUNDLING TRAP: D3120 is ALWAYS bundled into the restoration performed on the same date — only billable as a standalone procedure on a DIFFERENT date from any restoration',
    ],
  },

  D3310: {
    description: 'Endodontic therapy — anterior tooth (excluding final restoration)',
    denialRisk: 'Low',
    requiredDocs: [
      'Pre-operative periapical radiograph',
      'Post-operative periapical radiograph',
      'Clinical notes documenting pulpal diagnosis',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'Once per tooth',
    preAuthRequired: false,
    supportingDiagnoses: ['K04.0', 'K04.01', 'K04.1', 'K04.6', 'K04.7'],
    criticalNotes: [],
  },

  D3320: {
    description: 'Endodontic therapy — premolar tooth (excluding final restoration)',
    denialRisk: 'Low',
    requiredDocs: [
      'Pre-operative periapical radiograph',
      'Post-operative periapical radiograph',
      'Clinical notes documenting pulpal diagnosis',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'Once per tooth',
    preAuthRequired: false,
    supportingDiagnoses: ['K04.0', 'K04.01', 'K04.1', 'K04.6', 'K04.7'],
    criticalNotes: [],
  },

  D3330: {
    description: 'Endodontic therapy — molar tooth (excluding final restoration)',
    denialRisk: 'Medium',
    requiredDocs: [
      'Pre-operative periapical radiograph',
      'Post-operative periapical radiograph',
      'Clinical notes documenting pulpal diagnosis and canal count',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'Once per tooth; some plans have waiting periods — verify',
    preAuthRequired: false,
    supportingDiagnoses: ['K04.0', 'K04.01', 'K04.1', 'K04.6', 'K04.7'],
    criticalNotes: [
      'Some plans have waiting periods — verify before submitting',
    ],
  },

  D4341: {
    description: 'Periodontal scaling and root planing — 4 or more teeth per quadrant',
    denialRisk: 'Very High',
    requiredDocs: [
      'Complete 6-point periodontal charting',
      'Radiographs demonstrating bone loss',
      'Documented periodontal diagnosis',
      'Tooth count confirming 4 or more teeth in the quadrant',
    ],
    bundlingConflicts: ['D1110', 'D1120', 'D4910', 'D4342', 'D4355'],
    frequencyLimit: 'Once per quadrant per 24 months',
    preAuthRequired: false,
    supportingDiagnoses: ['K05.2', 'K05.3', 'K05.30', 'K05.31', 'K05.311', 'K05.312', 'K05.319', 'K05.32'],
    criticalNotes: [
      'Most denied periodontal code in dentistry',
      'Pockets of 4mm alone are insufficient — must show radiographic bone loss',
      'If only 1-3 teeth treated in the quadrant, use D4342 — billing D4341 for fewer teeth = upcoding',
      'Cannot bill D1110 same visit under any circumstance',
    ],
  },

  D4342: {
    description: 'Periodontal scaling and root planing — 1 to 3 teeth per quadrant',
    denialRisk: 'Very High',
    requiredDocs: [
      '6-point periodontal chart dated within 6 months of service',
      'Probing depths ≥4mm for affected teeth',
      'Radiographic evidence of localized bone loss',
      'Tooth count confirming 1-3 teeth in the quadrant',
    ],
    bundlingConflicts: ['D1110', 'D1120', 'D4910', 'D4341'],
    frequencyLimit: 'Once per quadrant per 24 months',
    preAuthRequired: false,
    supportingDiagnoses: ['K05.2', 'K05.3', 'K05.30', 'K05.31', 'K05.311'],
    criticalNotes: [
      'Same documentation requirements as D4341',
      'Use when 1-3 teeth per quadrant treated — billing D4341 for fewer than 4 teeth = upcoding',
    ],
  },

  D4355: {
    description: 'Full mouth debridement to enable a comprehensive oral evaluation',
    denialRisk: 'Medium',
    requiredDocs: [
      'Clinical notes documenting heavy calculus preventing evaluation',
    ],
    bundlingConflicts: ['D1110', 'D4341', 'D4342'],
    frequencyLimit: 'Once per lifetime per patient',
    preAuthRequired: false,
    supportingDiagnoses: ['K05.3', 'K05.30'],
    criticalNotes: [
      'One-time only per patient',
      'Cannot bill D1110 same date',
      'Bill comprehensive evaluation (D0150) at a subsequent appointment — not same day as D4355',
    ],
  },

  D4910: {
    description: 'Periodontal maintenance (perio recall after active SRP therapy)',
    denialRisk: 'Very High',
    requiredDocs: [
      'Documentation that patient completed prior SRP (D4341 or D4342)',
      'Dates of prior SRP must be in chart records',
      'Current periodontal chart showing maintenance status',
    ],
    bundlingConflicts: ['D1110', 'D1120', 'D4341', 'D4342'],
    frequencyLimit: 'Every 3–4 months for active perio; every 6 months for stable maintenance (payer-dependent)',
    preAuthRequired: false,
    supportingDiagnoses: ['K05.30', 'K05.31', 'K05.32', 'Z29.8'],
    criticalNotes: [
      'Denied by every payer without prior documented history of SRP (D4341/D4342)',
      'Date of prior SRP must be in chart records — if SRP was done at prior provider, obtain and attach records',
      'D4910 is NOT a substitute for D1110 — completely different procedure',
      'Cannot bill D1110 same day under any circumstance',
      'Narrative must reference prior SRP dates',
    ],
  },

  D5110: {
    description: 'Complete denture — maxillary',
    denialRisk: 'Medium',
    requiredDocs: [
      'Documentation of edentulous arch',
      'Pre-authorization if required by payer',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'Once every 5–7 years most payers',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.109', 'K08.401'],
    criticalNotes: [
      'Impressions, bite registration, and delivery are all included — do not bill separately',
    ],
  },

  D5120: {
    description: 'Complete denture — mandibular',
    denialRisk: 'Medium',
    requiredDocs: [
      'Documentation of edentulous arch',
      'Pre-authorization if required by payer',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'Once every 5–7 years most payers',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.109', 'K08.401'],
    criticalNotes: [
      'Impressions, bite registration, and delivery are all included — do not bill separately',
    ],
  },

  D6010: {
    description: 'Surgical placement of implant body (endosseous implant)',
    denialRisk: 'Very High',
    requiredDocs: [
      'Radiograph of failed/missing tooth (pre-extraction or post-extraction)',
      'CBCT scan if available',
      'Implant justification letter explaining why implant is preferred over alternatives',
      'Documentation of alternatives considered (bridge, partial denture)',
      'Medical history relevant to implant candidacy',
      'Pre-authorization (mandatory for all plans that cover implants)',
    ],
    bundlingConflicts: ['D6065', 'D6066'],
    frequencyLimit: 'One implant per missing tooth site; waiting periods vary (6–12 months post-extraction)',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.101', 'K08.102', 'K08.109', 'K08.401', 'K08.402', 'K08.409'],
    criticalNotes: [
      'CRITICAL: Many plans exclude implants entirely — verify benefits BEFORE treatment',
      'Narrative and pre-auth required if covered',
    ],
  },

  D6065: {
    description: 'Implant supported porcelain/ceramic crown',
    denialRisk: 'High',
    requiredDocs: [
      'Documentation that implant (D6010) is osseointegrated and restored',
      'Periapical X-ray showing implant integration',
      'Implant placement records',
    ],
    bundlingConflicts: ['D6010', 'D6066'],
    frequencyLimit: '5-year replacement limitation; verify whether payer applies standard crown frequency limits to implant crowns',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.101', 'K08.102', 'K08.409'],
    criticalNotes: [
      'Verify whether payer applies standard crown frequency limits to implant crowns',
    ],
  },

  D6066: {
    description: 'Implant supported crown — porcelain fused to predominantly base alloy',
    denialRisk: 'High',
    requiredDocs: [
      'Documentation that implant is osseointegrated',
      'Periapical X-ray showing implant integration',
      'Implant placement records',
    ],
    bundlingConflicts: ['D6010', 'D6065'],
    frequencyLimit: '5-year replacement limitation',
    preAuthRequired: true,
    supportingDiagnoses: ['K08.101', 'K08.102', 'K08.409'],
    criticalNotes: [],
  },

  D6750: {
    description: 'Retainer crown — porcelain fused to high noble metal',
    denialRisk: 'High',
    requiredDocs: [
      'Pre-operative periapical radiograph',
      'Clinical notes documenting crown necessity',
      'LAB RECEIPT CONFIRMING HIGH NOBLE ALLOY COMPOSITION — REQUIRED',
    ],
    bundlingConflicts: [],
    frequencyLimit: '5-year replacement limitation (some payers 7 years)',
    preAuthRequired: true,
    supportingDiagnoses: ['K02.9', 'K08.81', 'K08.89'],
    criticalNotes: [
      'Same lab receipt requirement as D2750 — without lab receipt confirming high noble alloy, payer will automatically downcode to base metal rate',
    ],
  },

  D7140: {
    description: 'Extraction, erupted tooth or exposed root (simple extraction)',
    denialRisk: 'Low',
    requiredDocs: [
      'Pre-operative radiograph showing tooth to be extracted',
      'Clinical notes documenting reason for extraction',
      'Tooth number documented',
    ],
    bundlingConflicts: ['D7210', 'D7240', 'D9215'],
    frequencyLimit: 'No frequency limit',
    preAuthRequired: false,
    supportingDiagnoses: ['K08.419', 'K08.429', 'K02.9', 'K04.0', 'K04.1', 'K08.1'],
    criticalNotes: [
      'BUNDLING: D9215 (local anesthesia) is ALWAYS included in D7140 — never bill D9215 separately with this code',
    ],
  },

  D7210: {
    description: 'Extraction, erupted tooth requiring removal of bone and/or sectioning of tooth',
    denialRisk: 'Very High',
    requiredDocs: [
      'Pre-operative radiograph',
      'Operative note documenting AT LEAST ONE: flap elevation, bone removal/ostectomy, or tooth sectioning',
    ],
    bundlingConflicts: ['D7140', 'D7240', 'D9215'],
    frequencyLimit: 'No frequency limit',
    preAuthRequired: false,
    supportingDiagnoses: ['K08.419', 'K08.429', 'K01.1', 'K08.1'],
    criticalNotes: [
      'Most frequently downcoded surgical code in dental billing',
      'WITHOUT explicit documentation of flap elevation, bone removal, or tooth sectioning — every payer will downcode to D7140',
      'Aetna explicitly states: periodontally involved teeth with bone loss = routine removal — document surgical elements regardless of perio status',
      'BUNDLING: Local anesthesia (D9215) and sutures are ALWAYS included — never bill D9215 separately',
    ],
  },

  D7220: {
    description: 'Removal of impacted tooth — soft tissue',
    denialRisk: 'Medium',
    requiredDocs: [
      'Pre-operative radiograph showing soft tissue impaction classification',
      'Clinical notes documenting impaction type',
    ],
    bundlingConflicts: ['D9215'],
    frequencyLimit: 'Once per tooth',
    preAuthRequired: false,
    supportingDiagnoses: ['K01.1'],
    criticalNotes: [
      'Pre-op radiograph showing impaction classification is required — verify radiographic classification before billing',
    ],
  },

  D7230: {
    description: 'Removal of impacted tooth — partially bony',
    denialRisk: 'High',
    requiredDocs: [
      'Panoramic and/or periapical X-ray showing partial bony impaction',
      'Detailed operative note documenting surgical complexity',
    ],
    bundlingConflicts: ['D9215'],
    frequencyLimit: 'Once per tooth',
    preAuthRequired: false,
    supportingDiagnoses: ['K01.1'],
    criticalNotes: [
      'Detailed operative note required showing partial bony impaction',
    ],
  },

  D7240: {
    description: 'Removal of impacted tooth — completely bony, with or without space for eruption',
    denialRisk: 'High',
    requiredDocs: [
      'Panoramic or periapical X-ray clearly showing complete bony impaction',
      'Operative note documenting complete bony impaction encountered',
    ],
    bundlingConflicts: ['D7140', 'D7210'],
    frequencyLimit: 'Once per tooth (permanent teeth); no repeat billing',
    preAuthRequired: true,
    supportingDiagnoses: ['K01.1', 'K01.0'],
    criticalNotes: [
      'Radiograph must CLEARLY show complete bony impaction',
      'Common mistake: billing D7240 when radiograph shows only partial bony impaction = upcoding — use D7230 instead',
    ],
  },

  D8080: {
    description: 'Comprehensive orthodontic treatment — adolescent dentition',
    denialRisk: 'Medium',
    requiredDocs: [
      'Pre-treatment records (photos, models, X-rays)',
      'Pre-authorization (required by most payers)',
      'Treatment plan',
    ],
    bundlingConflicts: [],
    frequencyLimit: 'Ortho lifetime maximum separate from annual dental maximum; age limits vary (many plans: under 19)',
    preAuthRequired: true,
    supportingDiagnoses: ['K07.20', 'K07.21', 'K07.22'],
    criticalNotes: [
      'Most plans have ortho lifetime maximums separate from annual dental maximum',
      'Age limits vary significantly — many plans limit to under 19',
    ],
  },

  D9215: {
    description: 'Local anesthesia not in conjunction with operative or surgical procedures',
    denialRisk: 'Very High',
    requiredDocs: [
      'Clinical notes confirming anesthesia was the SOLE service on this date',
      'No other procedures billed same date',
    ],
    bundlingConflicts: ['D7140', 'D7210', 'D7220', 'D7230', 'D7240', 'D4341', 'D4342', 'D2740', 'D2750', 'D3310', 'D3320', 'D3330'],
    frequencyLimit: 'N/A — billable only as sole service',
    preAuthRequired: false,
    supportingDiagnoses: [],
    criticalNotes: [
      'ONLY billable when anesthesia is the SOLE service with NO other procedure on the same date',
      'Billing D9215 with ANY surgical, restorative, periodontal, or endodontic code = improper unbundling = denied by every payer',
      'This is the most common unbundling error in dental billing',
    ],
  },
};
