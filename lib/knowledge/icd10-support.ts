export interface Icd10Entry {
  description: string;
  supports: string[];
  justification: string;
}

export const ICD10_SUPPORT: Record<string, Icd10Entry> = {
  // Periodontal disease
  'K05.2': {
    description: 'Aggressive periodontitis',
    supports: ['D4341', 'D4342', 'D4910'],
    justification: 'Aggressive periodontitis (Stage III/IV AAP 2017 classification) requires active periodontal therapy including scaling and root planing; rapid bone loss pattern supports urgent treatment frequency',
  },
  'K05.3': {
    description: 'Chronic periodontitis (general)',
    supports: ['D4341', 'D4342', 'D4910'],
    justification: 'Chronic periodontitis supports scaling and root planing per AAP 2017 Classification guidelines; severity determines frequency of supportive periodontal therapy',
  },
  'K05.30': {
    description: 'Chronic periodontitis, unspecified',
    supports: ['D4341', 'D4342', 'D4910'],
    justification: 'Chronic periodontitis supports SRP and ongoing periodontal maintenance per AAP guidelines',
  },
  'K05.31': {
    description: 'Chronic generalized periodontitis',
    supports: ['D4341', 'D4342', 'D4910'],
    justification: 'Stage II–III generalized periodontitis supports scaling and root planing (D4341) followed by 3–4 month supportive periodontal therapy (D4910) per AAP 2017 Classification',
  },
  'K05.311': {
    description: 'Chronic generalized periodontitis, slight',
    supports: ['D4342', 'D4910'],
    justification: 'Slight generalized periodontitis (Stage I/II) supports localized SRP and 6-month maintenance intervals',
  },
  'K05.312': {
    description: 'Chronic generalized periodontitis, moderate',
    supports: ['D4341', 'D4342', 'D4910'],
    justification: 'Moderate generalized periodontitis supports full-quadrant SRP and 3–4 month maintenance',
  },
  'K05.319': {
    description: 'Chronic generalized periodontitis, severe',
    supports: ['D4341', 'D4342', 'D4910'],
    justification: 'Severe periodontitis (Stage III/IV) requires active SRP therapy and 3-month supportive intervals per AAP guidelines',
  },
  'K05.32': {
    description: 'Chronic localized periodontitis',
    supports: ['D4342', 'D4910'],
    justification: 'Localized periodontitis supports site-specific SRP (D4342) and maintenance',
  },
  // Dental caries
  'K02.9': {
    description: 'Dental caries, unspecified',
    supports: ['D2140', 'D2150', 'D2160', 'D2161', 'D2740', 'D2750'],
    justification: 'Carious lesion of any surface justifies restorative treatment; extent of caries determines appropriate restoration type',
  },
  'K02.51': {
    description: 'Dental caries on pit and fissure surface limited to enamel',
    supports: ['D2140', 'D2150'],
    justification: 'Enamel-limited caries supports conservative 1–2 surface restoration',
  },
  'K02.52': {
    description: 'Dental caries on pit and fissure surface penetrating into dentin',
    supports: ['D2140', 'D2150', 'D2160', 'D2161'],
    justification: 'Dentin-penetrating caries supports amalgam or composite restoration; multi-surface codes appropriate for extensive involvement',
  },
  'K02.53': {
    description: 'Dental caries on pit and fissure surface penetrating into pulp',
    supports: ['D2140', 'D2150', 'D2740', 'D2750', 'D3310', 'D3330'],
    justification: 'Pulp-penetrating caries supports endodontic treatment followed by full-coverage restoration (crown)',
  },
  'K02.61': {
    description: 'Dental caries on smooth surface limited to enamel',
    supports: ['D2140', 'D2150', 'D2335'],
    justification: 'Smooth surface enamel caries supports conservative restoration',
  },
  'K02.62': {
    description: 'Dental caries on smooth surface penetrating into dentin',
    supports: ['D2140', 'D2150', 'D2160', 'D2161', 'D2330', 'D2335'],
    justification: 'Smooth surface dentin caries supports composite or amalgam restoration',
  },
  'K02.63': {
    description: 'Dental caries on smooth surface penetrating into pulp',
    supports: ['D2740', 'D2750', 'D3310', 'D3330'],
    justification: 'Pulp-penetrating smooth surface caries supports endodontic therapy and crown restoration',
  },
  // Tooth loss and missing teeth
  'K08.101': {
    description: 'Complete loss of teeth due to trauma, class I',
    supports: ['D6010', 'D6065', 'D6066'],
    justification: 'Traumatic tooth loss supports implant placement as standard of care for single-tooth replacement',
  },
  'K08.102': {
    description: 'Complete loss of teeth due to periodontal diseases, class I',
    supports: ['D6010', 'D6065', 'D6066'],
    justification: 'Tooth loss due to periodontal disease supports implant replacement after adequate bone healing',
  },
  'K08.109': {
    description: 'Complete loss of teeth, unspecified cause, class I',
    supports: ['D6010', 'D6065', 'D6066'],
    justification: 'Tooth loss supports implant-based replacement as evidence-based standard for missing tooth restoration',
  },
  'K08.401': {
    description: 'Partial loss of teeth due to trauma, class I',
    supports: ['D6010', 'D6065', 'D6066'],
    justification: 'Partial tooth loss from trauma supports implant or bridge restoration',
  },
  'K08.409': {
    description: 'Partial loss of teeth, unspecified cause, class I',
    supports: ['D6010', 'D6065', 'D6066'],
    justification: 'Partial edentulism supports implant-supported crown as preferred restorative option',
  },
  // Crown indications
  'K08.81': {
    description: 'Cracked tooth',
    supports: ['D2740', 'D2750'],
    justification: 'Cracked tooth syndrome with fracture extending to dentin requires full-coverage crown to prevent propagation and tooth loss',
  },
  'K08.89': {
    description: 'Other specified disorders of teeth',
    supports: ['D2740', 'D2750'],
    justification: 'Structural tooth defects supporting crown placement',
  },
  // Pulpal disease (endodontic)
  'K04.0': {
    description: 'Pulpitis',
    supports: ['D2740', 'D2750', 'D3310', 'D3330'],
    justification: 'Irreversible pulpitis requires root canal treatment; post-endodontic crown is standard of care to protect restored tooth',
  },
  'K04.1': {
    description: 'Necrosis of pulp',
    supports: ['D2740', 'D2750', 'D3310', 'D3330'],
    justification: 'Pulp necrosis requires endodontic treatment and full-coverage crown restoration',
  },
  // Impacted teeth
  'K01.1': {
    description: 'Impacted tooth',
    supports: ['D7210', 'D7240'],
    justification: 'Impacted tooth supports surgical extraction; bony impaction depth determines appropriate extraction code (D7210 vs D7240)',
  },
  'K01.0': {
    description: 'Embedded tooth',
    supports: ['D7240'],
    justification: 'Fully embedded tooth requires complete bony removal procedure (D7240)',
  },
  // Extractions
  'K08.419': {
    description: 'Partial loss of teeth due to periodontal diseases',
    supports: ['D7140', 'D7210'],
    justification: 'Teeth with advanced periodontal disease not amenable to treatment support extraction',
  },
  'K08.429': {
    description: 'Partial loss of teeth due to dental caries',
    supports: ['D7140', 'D7210'],
    justification: 'Non-restorable carious tooth supports extraction',
  },
  'K08.1': {
    description: 'Loss of teeth due to accident, extraction, or local periodontal disease',
    supports: ['D7140', 'D7210', 'D6010'],
    justification: 'Documented tooth loss history supports extraction of compromised teeth and subsequent implant placement',
  },
  // Preventive / recall
  'Z01.20': {
    description: 'Encounter for dental examination and cleaning without abnormal findings',
    supports: ['D0120', 'D1110', 'D1120', 'D0210'],
    justification: 'Routine dental encounter supports prophylaxis and periodic evaluation services',
  },
  'Z01.21': {
    description: 'Encounter for dental examination and cleaning with abnormal findings',
    supports: ['D0120', 'D0150', 'D1110', 'D1120', 'D0210', 'D4341'],
    justification: 'Dental encounter with abnormal findings supports additional diagnostic and therapeutic procedures',
  },
  // Trauma
  'S02.5XXA': {
    description: 'Fracture of tooth, initial encounter',
    supports: ['D2740', 'D2750', 'D7140', 'D7210'],
    justification: 'Tooth fracture supports crown placement for restorable teeth or extraction for non-restorable fractures',
  },
  // Perio maintenance
  'Z29.8': {
    description: 'Encounter for other specified prophylactic measures',
    supports: ['D4910'],
    justification: 'Supportive periodontal maintenance encounter supports D4910 for patients who have completed active periodontal therapy',
  },
};
