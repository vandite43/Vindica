export interface ClinicalGuidelineCategory {
  title: string;
  source: string;
  content: string;
}

export const CLINICAL_GUIDELINES: Record<string, ClinicalGuidelineCategory> = {
  periodontalTherapy: {
    title: 'Periodontal Therapy — AAP 2017 Classification',
    source: 'American Academy of Periodontology / European Federation of Periodontology 2017 Classification of Periodontal Diseases',
    content: `Stage I (mild): probing depths ≤4mm, bone loss <15% — supports D4342 and 6-month D4910 intervals.
Stage II (moderate): probing depths ≤5mm, bone loss 15–33% — supports D4341 and 4–6 month D4910 intervals.
Stage III (severe): probing depths ≥6mm, bone loss >33%, tooth loss — supports D4341, specialist referral, 3–4 month D4910.
Stage IV (very severe): same as III plus masticatory dysfunction — supports urgent D4341 and multi-disciplinary care.
Supportive periodontal therapy (D4910) intervals per AAP: 3 months for Stage III/IV during active disease; 6 months once stable.
Scaling and root planing (D4341/D4342) is supported by Level A evidence for reducing probing depths in pockets ≥4mm.`,
  },
  implants: {
    title: 'Dental Implants — ADA Evidence-Based Clinical Practice Guideline',
    source: 'ADA Evidence-Based Clinical Practice Guideline for the Evaluation of Potential Implant Sites (2016)',
    content: `Endosseous implants are indicated when natural tooth retention is not feasible due to: non-restorable caries, advanced periodontal disease, trauma, or congenital absence.
Required documentation for implant justification: (1) radiograph of failed or missing tooth site, (2) evidence of adequate bone volume or bone grafting records, (3) treatment alternatives considered (bridge, removable partial), (4) systemic health assessment for implant candidacy.
Osseointegration period: minimum 8–16 weeks before crown placement (D6065/D6066); CBCT recommended for complex sites.
ADA guideline supports implants as equivalent or superior to fixed partial dentures for single-tooth replacement in terms of long-term outcomes and preservation of adjacent tooth structure.`,
  },
  crowns: {
    title: 'Crown Placement — ADA Guidelines and Payer Standards',
    source: 'ADA Clinical Practice Guidelines; NADP Coverage Criteria Standards',
    content: `Crown placement (D2740/D2750) is medically necessary when one or more of the following are documented:
1. Tooth structure loss ≥50% of the clinical crown (caries, fracture, or attrition)
2. Fractured cusp at risk for complete tooth fracture
3. Post-endodontic restoration (crown following root canal therapy on posterior teeth)
4. Existing restoration failure with inadequate remaining tooth structure for replacement filling
5. Cracked tooth syndrome with crack extending to dentin or pulp
Required documentation: pre-operative periapical or bitewing radiograph taken within 12 months; clinical narrative explaining necessity; tooth number and surface designation.
All-ceramic crowns (D2740): ADA standard of care for anterior teeth; clinical or esthetic justification required for posterior all-ceramic over PFM (D2750) when payer applies alternate benefit.`,
  },
  periodontalMaintenance: {
    title: 'Periodontal Maintenance (D4910) — Frequency Standards',
    source: 'American Academy of Periodontology Position Paper on Supportive Periodontal Therapy (2003, updated guidelines 2018)',
    content: `D4910 (periodontal maintenance) is appropriate ONLY for patients who have completed a course of active periodontal therapy (D4341 or D4342).
It cannot be substituted for prophylaxis (D1110) in patients without periodontal disease history.
Recommended frequency:
- Active/unstable periodontal patients: every 3 months
- Stable periodontal patients (pockets ≤4mm, no bleeding): every 4–6 months
- Risk factors justifying increased frequency: tobacco use, diabetes, immunosuppression, poor compliance history
AAP Position: once a patient is diagnosed with periodontitis, lifelong 3–6 month supportive therapy is the standard of care; this overrides standard prophylaxis frequency rules for such patients.`,
  },
  extractionCriteria: {
    title: 'Tooth Extraction Criteria',
    source: 'ADA/AAOMS Clinical Guidelines; Dental Coverage Policy Standards',
    content: `Simple extraction (D7140): erupted tooth with sufficient crown structure for forceps delivery; no surgical access required.
Surgical extraction (D7210): tooth requiring bone removal, sectioning, or mucoperiosteal flap; elevated impaction (partially erupted or soft tissue); malposed roots.
Complete bony impaction (D7240): tooth completely covered by bone; panoramic or periapical radiograph must confirm full bony coverage; angulation and depth documented.
Documentation requirement: radiograph showing position and relationship of tooth to adjacent structures; clinical notes justifying surgical vs. simple approach when complexity is questioned by payer.`,
  },
  diagnosticRadiographs: {
    title: 'Dental Radiograph Frequency — ADA/FDA Guidelines',
    source: 'ADA/FDA Dental Radiographic Examinations: Recommendations for Patient Selection and Limiting Radiation Exposure (2012, updated 2024)',
    content: `Full mouth radiographic series (D0210):
- New adult patients: indicated regardless of prior films from another provider
- Established adult patients with evidence of disease: every 3–5 years
- Established adult patients, no clinical problems: every 5 years minimum
Bitewing radiographs (D0272–D0274): every 6–18 months for patients with active caries risk; every 2–3 years for low-risk adult patients.
Periapical radiographs: indicated for specific clinical findings (abscess, root fracture, perio bone loss evaluation, endodontic assessment).
Payers cannot deny radiographs that fall within ADA/FDA recommended intervals when clinical indication is documented.`,
  },
};

// Maps CDT procedure categories to relevant guideline keys
export const CDT_TO_GUIDELINE_MAP: Record<string, string[]> = {
  D4341: ['periodontalTherapy', 'periodontalMaintenance'],
  D4342: ['periodontalTherapy', 'periodontalMaintenance'],
  D4910: ['periodontalMaintenance', 'periodontalTherapy'],
  D6010: ['implants'],
  D6065: ['implants'],
  D6066: ['implants'],
  D2740: ['crowns'],
  D2750: ['crowns'],
  D7140: ['extractionCriteria'],
  D7210: ['extractionCriteria'],
  D7240: ['extractionCriteria'],
  D0210: ['diagnosticRadiographs'],
  D0120: ['diagnosticRadiographs'],
};
