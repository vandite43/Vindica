'use client';

import { useState } from 'react';
import {
  Clock, AlertTriangle, TrendingDown, Shield, BookOpen,
  Eye, ChevronRight,
} from 'lucide-react';

interface DenialTrigger { title: string; detail: string; }
interface WatchItem { label: string; detail: string; }

interface PayerProfile {
  id: string;
  name: string;
  nickname: string;
  trait: string;
  badges: string[];
  timelyFiling: string;
  processingTime: string;
  appealWindow: string;
  appealMethod: string;
  downcodingRisk: 'Low' | 'Medium' | 'High' | 'Very High' | 'N/A';
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard';
  denialTriggers: DenialTrigger[];
  appealStrategy: string[];
  feeSchedule: string[];
  watchItems: WatchItem[];
}

const PAYERS: PayerProfile[] = [
  {
    id: 'delta',
    name: 'Delta Dental',
    nickname: 'The Fragmented Giant',
    trait: '39 independent regional affiliates — each operates under different rules, fee schedules, and policies. The payer you think you know varies dramatically by state.',
    badges: ['Regional Fragmentation', 'FMX Bundling Trap', 'Assignment Issues'],
    timelyFiling: '12–18 months',
    processingTime: '14–30 days',
    appealWindow: '180 days (60 days for second-level)',
    appealMethod: 'Written + Electronic',
    downcodingRisk: 'High',
    difficulty: 'Hard',
    denialTriggers: [
      { title: 'Frequency Code 222', detail: "Their #1 denial trigger. Applies to most preventive and diagnostic procedures. Verify benefit year dates and prior service history before submitting." },
      { title: 'FMX Reclassification', detail: 'Submitting 6+ periapical films with bitewings triggers automatic reclassification as a full-mouth series (D0210), starting a 3–5 year frequency clock.' },
      { title: 'Multi-surface Downgrading', detail: 'Regularly downcodes multi-surface amalgams/composites to single-surface. Document each surface distinctly in clinical notes.' },
      { title: 'Missing Pre-Authorization (Implants)', detail: 'D6010 requires pre-auth with most Delta affiliates. Obtain before any implant surgery.' },
      { title: 'Non-Par Assignment Issues', detail: 'Some affiliates do NOT honor assignment of benefits for non-participating dentists — payment goes directly to the patient.' },
    ],
    appealStrategy: [
      'Submit written appeal within 180 days of denial. Include clinical notes, radiographs, and payer-specific documentation requirements.',
      'For FMX frequency denials: document clinical necessity with periodontal charting and attachment level measurements.',
      'Second-level appeal must be filed within 60 days of first-level denial.',
      'Decision typically within 30 days of appeal receipt.',
      "Always submit to the patient's specific Delta affiliate — not your local Delta company.",
    ],
    feeSchedule: [
      'Three-tier system: Delta Premier (pays Max Plan Allowance by ZIP code), Delta PPO (lower contracted rate), DeltaCare DHMO (fixed copays, no fee-for-service).',
      'Historically downcodes multi-surface restorations to single surface — always document each surface separately.',
      'Some regional affiliates do NOT honor assignment of benefits for non-par dentists. Verify per affiliate. Patient may receive check directly.',
      "Verify which Delta network the patient's employer has contracted — Premier and PPO rates differ significantly.",
    ],
    watchItems: [
      { label: '39 Independent Affiliates', detail: 'Delta Dental is not one company. Always submit to the affiliate that administers the patient\'s plan, not your local Delta.' },
      { label: 'FMX Frequency Trap', detail: 'Filing 6–8+ periapical films alongside bitewing X-rays will trigger automatic FMX reclassification (D0210) and a 3–5 year frequency window.' },
      { label: 'Frequency Code 222', detail: "Delta's proprietary frequency denial code — their most-issued denial. Pull patient's full Delta benefit history before submitting preventive/diagnostic codes." },
      { label: 'Assignment of Benefits', detail: 'Certain regional affiliates bypass provider assignment and send payment to patient. Verify per plan before services are rendered.' },
    ],
  },
  {
    id: 'cigna',
    name: 'Cigna',
    nickname: 'The Downcoding Machine',
    trait: 'Systematic AI-driven downcoding of posterior composites, surgical extractions, and crowns — appealing is not optional, it is routine.',
    badges: ['AI Downcoding', 'Strict Frequency', 'High Appeal Volume'],
    timelyFiling: '90 days (par) / 180 days (non-par)',
    processingTime: '14–21 days',
    appealWindow: '180 days standard; 365 days for CA providers',
    appealMethod: 'Phone first, then written formal appeal',
    downcodingRisk: 'Very High',
    difficulty: 'Very Hard',
    denialTriggers: [
      { title: 'Posterior Composite → Amalgam Rate', detail: "Cigna's AI systematically pays posterior composites at the lower amalgam rate. This is their most common payment reduction." },
      { title: 'Surgical Extraction Downgrading', detail: 'D7210 (surgical) regularly downgraded to D7140 (simple). Document bone removal or sectioning explicitly in notes.' },
      { title: 'Waiting Period Violations', detail: 'Strict 6-month waiting period for basic services, 12 months for major services. Any gap in coverage activates waiting periods from enrollment.' },
      { title: 'Frequency Violations', detail: 'Tightly enforced. D1110 frequency, D0210 frequency, and D4910 intervals are audited against their claims history database.' },
      { title: 'Missing Documentation for SRP', detail: 'D4341/D4342 routinely denied without complete periodontal charting showing probing depths ≥4mm per tooth.' },
    ],
    appealStrategy: [
      'CALL FIRST before submitting a formal written appeal. Many Cigna downcoded claims are resolved over the phone in a single call. This saves weeks.',
      'Formal written appeal: 180-day window from denial date (365 days for California providers).',
      "Include complete clinical documentation — Cigna's AI downcoding is overturned when documentation directly contradicts their automated assessment.",
      "California providers: the California Medical Association has formally opposed Cigna's AI downcoding policy — use this in appeal language.",
      'Appeals are essential, not optional — most downcoded Cigna claims are overturnable with the right documentation.',
    ],
    feeSchedule: [
      'Systematic AI-driven downcoding: posterior composites routinely paid at amalgam rate. This is not case-by-case — it is algorithmic.',
      'Surgical extractions frequently paid at simple extraction rate (D7140 instead of D7210). Explicit documentation of bone removal required.',
      'Strict waiting period enforcement: 6 months for basic, 12 months for major services. Waiting periods activated by any break in coverage.',
      'Generally does not offer LEAT provisions as aggressively as Aetna, but downcoding achieves similar result.',
    ],
    watchItems: [
      { label: 'AI Downcoding is Systemic', detail: 'Cigna uses algorithmic payment reduction that is not case-specific. Build appealing downcoded claims into your regular workflow — this will happen on most posterior composites.' },
      { label: 'California Exception', detail: "California providers have an extended 365-day appeal window. The CMA's formal opposition to Cigna's AI policy is useful appeal language." },
      { label: 'Waiting Periods are Ironclad', detail: 'Any prior coverage gap (even one day) activates waiting periods from new enrollment date. Obtain proof of prior continuous coverage before rendering major services.' },
      { label: 'Phone Appeals Work', detail: 'Unlike MetLife, Cigna will resolve many downcoded claims over the phone. Call the provider relations line before completing a full written appeal.' },
    ],
  },
  {
    id: 'aetna',
    name: 'Aetna',
    nickname: 'Silent Revenue Reducer',
    trait: '"Claim and Code Review Program" silently downcodes claims — reduced payments arrive without formal denial notices or explanation codes.',
    badges: ['Silent Downcoding', 'Aggressive LEAT', 'ERA Monitoring Critical'],
    timelyFiling: '90 days',
    processingTime: '14–21 days',
    appealWindow: '180 days',
    appealMethod: 'Peer-to-Peer dental consultant first (fax 1-877-867-8729), then written',
    downcodingRisk: 'Very High',
    difficulty: 'Hard',
    denialTriggers: [
      { title: 'Silent Downcoding via CCRP', detail: "Aetna's \"Claim and Code Review Program\" reduces payments by an average of 6.4% without generating a formal denial — just a lower payment. No CARC code." },
      { title: 'High Noble Crown at Base Metal Rate', detail: 'High noble crowns (D2750) routinely paid at base metal (D2710/D2712) rate. Appeal with lab invoice showing alloy content.' },
      { title: 'Aggressive LEAT Provisions', detail: 'Least Expensive Alternative Treatment downcodes crowns to large fillings, implants to partial dentures, when payer deems the cheaper option "adequate."' },
      { title: 'Waiting Period Enforcement', detail: 'Waiting periods only waived with proof of prior continuous coverage of at least 90 days with a prior dental plan.' },
      { title: 'Missing ICD-10 Codes', detail: 'Aetna increasingly requires ICD-10 diagnosis codes alongside CDT codes for surgical and restorative procedures.' },
    ],
    appealStrategy: [
      'REQUEST PEER-TO-PEER REVIEW FIRST. Call Aetna dental consultant before filing formal written appeal. This is faster and resolves 60–70% of appeals.',
      'Fax number for peer-to-peer and clinical appeals: 1-877-867-8729.',
      'Formal appeal window: 180 days from date of denial or payment.',
      'Monitor every ERA against expected contractual amount — silent downcoding generates no denial notice.',
      'For LEAT disputes: appeal with clinical documentation showing why the less expensive alternative is clinically inadequate.',
    ],
    feeSchedule: [
      '"Claim and Code Review Program" (CCRP) produces average 6.4% payment reduction through silent downcoding — payments reduced without formal denial notices.',
      'Aggressive LEAT provisions — payer applies "least expensive alternative" across crown vs filling, implant vs removable, surgical vs conservative treatment decisions.',
      'High noble crowns regularly paid at base metal rate. Always submit lab invoice showing alloy type with D2750 claims.',
      'Waiting periods strictly enforced: waived only with proof of 90+ days prior continuous coverage.',
    ],
    watchItems: [
      { label: 'Monitor Every ERA', detail: "Aetna's silent downcoding generates no denial code or explanation — just a lower check. Compare every ERA payment against your fee schedule to detect reductions." },
      { label: 'Peer-to-Peer is Faster', detail: 'The peer-to-peer dental consultant review option (fax 1-877-867-8729) resolves most CCRP downcodes faster than formal appeals. Use it first.' },
      { label: 'LEAT is Aggressive', detail: 'Aetna frequently applies LEAT provisions that are clinically inappropriate. Document WHY the less expensive alternative is not adequate for this patient.' },
      { label: 'Waiting Period Exception', detail: 'Waiting periods CAN be waived — but only with documentation proving 90+ days of prior dental coverage without interruption.' },
    ],
  },
  {
    id: 'metlife',
    name: 'MetLife',
    nickname: 'Most Straightforward',
    trait: 'The most predictable and transparent of major commercial payers — consistent fee schedules, standard processes, writing-only appeals.',
    badges: ['Writing-Only Appeals', 'Predictable Fee Schedule', 'Moderate Downcoding'],
    timelyFiling: '12 months',
    processingTime: '14 business days',
    appealWindow: '180 days',
    appealMethod: 'Written ONLY — no phone, no electronic submission',
    downcodingRisk: 'Medium',
    difficulty: 'Moderate',
    denialTriggers: [
      { title: 'Frequency Violations', detail: 'Standard frequency enforcement (D1110 6-month, D0210 3–5 year). More forgiving than Cigna or Aetna on edge cases.' },
      { title: 'Missing Documentation', detail: 'Standard documentation requirements — perio chart for SRP, X-rays for restorative, narratives for surgical. No unique traps.' },
      { title: 'Waiting Period Issues', detail: 'Basic 6 months, major 12 months. More straightforward to waive with prior coverage proof than most payers.' },
      { title: 'Multi-surface Downgrading', detail: 'Occasional, but less systematic than Cigna or Aetna.' },
    ],
    appealStrategy: [
      'ALL APPEALS MUST BE IN WRITING. MetLife does not accept phone appeals or electronic appeal submissions.',
      'File written appeal within 180 days of denial date.',
      'Include all supporting clinical documentation — MetLife reviews fairly and thoroughly.',
      'Decision typically issued within 30 days of appeal receipt.',
      'Address to the MetLife appeals department; do not send to claim processing address.',
    ],
    feeSchedule: [
      'Generally fair and predictable fee schedule. One of the more consistent payers in the industry.',
      'Moderate downcoding — less aggressive than Cigna or Aetna. Multi-surface composites occasionally reduced to single surface.',
      'Clear fee schedule publication — request updated fee schedule annually to verify contracted rates.',
      'LEAT provisions exist but applied more reasonably than industry average.',
    ],
    watchItems: [
      { label: 'Writing Only', detail: 'This is absolute — MetLife will not process phone or electronic appeals under any circumstances. Build written appeal templates for common denial types.' },
      { label: '30-Day Decision', detail: 'MetLife meets the 30-day decision standard reliably. Follow up if no response after 35 days.' },
      { label: 'Request Fee Schedule Annually', detail: 'MetLife updates contracted rates annually. Obtain updated fee schedule at plan year start to ensure correct expected payment amounts.' },
      { label: 'Fair Process', detail: 'MetLife is generally considered fair by the dental billing community. If you lose an appeal, your documentation likely needs improvement.' },
    ],
  },
  {
    id: 'uhc',
    name: 'UnitedHealthcare',
    nickname: 'The Two-Step Payer',
    trait: 'Mandatory two-step appeal process — reconsideration must precede formal appeal, and you only get one reconsideration.',
    badges: ['Two-Step Process', 'Payer ID 52133', 'Strict Documentation'],
    timelyFiling: '90–180 days (plan-dependent)',
    processingTime: '14–21 days',
    appealWindow: '120–180 days (plan-dependent)',
    appealMethod: 'Reconsideration → Formal Appeal (two mandatory steps)',
    downcodingRisk: 'High',
    difficulty: 'Very Hard',
    denialTriggers: [
      { title: 'Missing or Wrong Payer ID', detail: "UHC's clearinghouse payer ID is 52133. Incorrect payer ID routes claims incorrectly, causing rejection or denial. Verify on every single claim." },
      { title: 'Incomplete Documentation', detail: "UHC has some of the strictest documentation requirements in the industry. Missing any item from their required documentation checklist = automatic denial." },
      { title: 'Strict Frequency Enforcement', detail: 'Tightly enforced across all service categories. D1110 (6-month), D0210 (3-year), D4910 (3–4 month) — any gap in history triggers denial.' },
      { title: 'Surgical vs Conservative Threshold', detail: 'UHC requires documented justification for surgical over conservative treatment. "Tooth is non-restorable" must be clinically justified with X-rays.' },
      { title: 'Missing Pre-Authorization', detail: 'Crown, implant, and surgical procedure pre-auths are mandatory. No retroactive authorization typically granted.' },
    ],
    appealStrategy: [
      'STEP 1 — RECONSIDERATION REQUIRED FIRST. File reconsideration with additional documentation before formal appeal. Only ONE reconsideration is allowed — make it count.',
      'STEP 2 — Formal Appeal. Only if reconsideration is denied. 120–180 days from denial.',
      'Do NOT skip reconsideration and go straight to formal appeal — UHC may reject the appeal as procedurally improper.',
      'Payer ID 52133 — verify on every claim submission and every appeal correspondence.',
      'Document all claim history and timely filing evidence when appealing CO-29 denials.',
    ],
    feeSchedule: [
      'Strict documentation requirements that effectively function as payment barriers when documentation is incomplete.',
      'Strict frequency enforcement — arguably the most aggressive of the major commercial payers.',
      'Fee schedule variation: UHC administers plans for many different employers with different fee schedules. Verify contracted rate per plan, not by payer name alone.',
      'Significant plan-to-plan variation — employer-sponsored UHC plans may differ dramatically from individual market UHC plans.',
    ],
    watchItems: [
      { label: 'Payer ID 52133', detail: 'Verify this on every single claim. Wrong payer ID = clearinghouse rejection, then timely filing countdown continues.' },
      { label: 'Two-Step is Mandatory', detail: 'Skipping reconsideration and filing a formal appeal directly may result in procedural denial. Always reconsider first.' },
      { label: 'One Reconsideration Only', detail: 'You get exactly one reconsideration. Prepare it thoroughly with all possible documentation before submitting.' },
      { label: 'Plan Variation is High', detail: 'UHC administers hundreds of employer plans. Benefit structures, fee schedules, and requirements vary significantly per employer contract. Do not assume one UHC plan behaves like another.' },
    ],
  },
  {
    id: 'guardian',
    name: 'Guardian',
    nickname: 'Specialist Friendly',
    trait: 'Generally fair, transparent, and predictable — considered one of the more professional and easier-to-work-with major commercial payers.',
    badges: ['Fair Process', '30-Day Decisions', 'Posterior All-Ceramic Note'],
    timelyFiling: '12 months',
    processingTime: '10–15 business days',
    appealWindow: '180 days',
    appealMethod: 'Standard written or electronic',
    downcodingRisk: 'Low',
    difficulty: 'Easy',
    denialTriggers: [
      { title: 'Posterior All-Ceramic Alternate Benefit', detail: 'Guardian applies alternate benefit (D2750 PFM rate) to posterior all-ceramic crowns (D2740). Appeal with clinical justification for ceramic material.' },
      { title: 'Frequency Violations', detail: 'Standard enforcement. Less punitive than major players, but still enforced.' },
      { title: 'Missing Radiographs for Restorative', detail: 'X-ray required for most restorative, surgical, and periodontal claims. Standard requirement, well-documented.' },
      { title: 'Non-Covered Services', detail: 'Guardian clearly documents plan exclusions. True non-covered services should be billed to patient, not appealed.' },
      { title: 'Implant Coverage Gap', detail: 'Older Guardian plans (pre-2018) often excluded implants. Many have since added coverage — verify the specific plan year and benefit structure before assuming exclusion.' },
    ],
    appealStrategy: [
      'Standard written or electronic appeal within 180 days of denial.',
      'Guardian is generally fair in appeal review — prepare complete documentation and expect a reasonable review.',
      'Decision within 30 days is standard and reliable.',
      'For posterior all-ceramic alternate benefit: appeal with clinical rationale for why PFM is clinically contraindicated (allergy, aesthetics, bite force factors).',
      'For pre-2018 implant exclusions: verify current plan documents — many Guardian plans updated post-2018 to include implants.',
    ],
    feeSchedule: [
      'Generally fair and predictable. One of the more dentist-friendly major commercial payers.',
      'Alternate benefit applied to posterior D2740 (all-ceramic) — paid at D2750 (PFM) rate. Document clinical necessity for ceramic when filing or pre-appealing.',
      'LEAT provisions exist but applied more reasonably than Aetna or Cigna.',
      'Clear fee schedule — request annually to maintain accurate expected payment tracking.',
    ],
    watchItems: [
      { label: 'Posterior All-Ceramic Alternate Benefit', detail: 'Guardian routinely applies D2750 (PFM) rate to posterior D2740 (all-ceramic) claims. Proactively document clinical rationale or submit predetermination.' },
      { label: 'Implant Coverage Transition', detail: 'Plans issued before 2018 commonly excluded implants. Plans renewed post-2018 often added coverage. Always verify the specific plan document rather than assuming exclusion or coverage.' },
      { label: 'One of the Easier Payers', detail: 'Guardian consistently ranks among the more straightforward commercial payers in billing surveys. If you are losing Guardian appeals frequently, review your documentation process.' },
      { label: '30-Day Decision Clock', detail: "Guardian reliably meets their 30-day appeal decision commitment. Follow up at 35 days if no response." },
    ],
  },
  {
    id: 'anthem',
    name: 'Anthem BCBS',
    nickname: 'The Medical Necessity Hawk',
    trait: '17% denial rate driven almost entirely by medical necessity challenges and pre-authorization requirements — the highest pre-auth burden of any commercial payer in the set.',
    badges: ['High Medical Necessity Denials', 'Strict Pre-Auth', 'Bundling Flags'],
    timelyFiling: '90–365 days (varies by plan)',
    processingTime: '14–21 days',
    appealWindow: '180 days',
    appealMethod: 'Written or electronic; peer-to-peer available for clinical denials',
    downcodingRisk: 'Medium',
    difficulty: 'Hard',
    denialTriggers: [
      { title: 'Not Medically Necessary', detail: 'Most-issued denial. Requires clinical narrative justifying why treatment was necessary over a conservative alternative. Submit proactively on every high-value claim.' },
      { title: 'Pre-Authorization Required', detail: 'Required for D6010, D4341, D4342, D7310, D7320. No retroactive auth — obtain before service is rendered.' },
      { title: 'Bundling/Unbundling', detail: 'Flags procedures Anthem considers components of a single service. Document each procedure as clinically distinct with separate notes and timing.' },
      { title: 'Missing Implant Documentation', detail: 'Bone graft procedures require ridge defect documentation, bone loss measurements, and a written clinical necessity narrative. Missing any element = denial.' },
      { title: 'Insufficient X-ray Series', detail: 'Full-mouth or periapical series required for crowns. A single bitewing is not sufficient to support a crown procedure with this payer.' },
    ],
    appealStrategy: [
      'For medical necessity denials: submit clinical narrative with specific measurements, radiographic findings, and ADA clinical guidelines citations.',
      'Written or electronic appeal within 180 days of denial date.',
      'Request peer-to-peer dental consultant review for complex clinical denials — often faster than formal written appeal.',
      'For pre-auth denials: document urgency or clinical emergency if retroactive auth is being sought.',
      'For bundling denials: submit separate clinical notes for each procedure showing distinct clinical decision and timing.',
    ],
    feeSchedule: [
      'Anthem BCBS operates as a federation of regional plans — benefit structures, fee schedules, and pre-auth requirements vary significantly by state affiliate.',
      'Medical necessity standard applied aggressively. Document treatment rationale proactively on every high-value claim.',
      'LEAT provisions apply to crown vs filling, implant vs removable decisions — document why less expensive alternative is clinically inadequate.',
      'Pre-auth codes: D6010, D4341, D4342, D7310, D7320. Verify current requirements annually — they change.',
    ],
    watchItems: [
      { label: 'Regional Plan Variation', detail: 'Anthem BCBS is not one national plan. Requirements for pre-auth, fee schedules, and covered services vary by state affiliate. Always verify the patient\'s specific plan.' },
      { label: 'Medical Necessity is Default Denial', detail: 'When in doubt, Anthem denies on medical necessity. A brief clinical narrative attached to every high-value claim preempts most of these denials.' },
      { label: 'Implant Documentation Package', detail: 'D6010 and bone graft codes require full documentation — bone loss measurements, failed tooth records, pre-op X-rays, and implant placement narrative.' },
      { label: 'Bundling Risk for Perio', detail: 'D4341/D4342 are flagged for bundling with certain restorative codes. Document perio and restorative procedures on separate visit dates where clinically appropriate.' },
    ],
  },
  {
    id: 'concordia',
    name: 'United Concordia',
    nickname: 'The Clean Claim Champion',
    trait: 'Lowest denial rate (11%) of any major commercial payer — consistently the fastest payer for clean claims. Most denials are preventable documentation errors, not coverage disputes.',
    badges: ['Lowest Denial Rate', 'Fast Processing', 'Documentation Driven'],
    timelyFiling: '12 months',
    processingTime: '14 days (fastest of major payers)',
    appealWindow: '180 days',
    appealMethod: 'Standard written or electronic',
    downcodingRisk: 'Low',
    difficulty: 'Easy',
    denialTriggers: [
      { title: 'Missing X-rays', detail: 'Top denial trigger. X-rays required for all restorative, perio, surgical, and implant claims. Attach before submitting — do not wait for a request.' },
      { title: 'Narrative Required', detail: 'Written clinical narrative required for extractions on patients under 18, implants, and surgical procedures. Clean claims skip this; denied claims cost weeks.' },
      { title: 'Coordination of Benefits', detail: 'COB denials occur when primary payer information is missing or incorrect on secondary claims. Attach primary EOB to all secondary claims.' },
      { title: 'Incorrect Tooth Numbering', detail: 'Standard Universal numbering required. Errors in tooth or surface codes trigger rejection at the clearinghouse level.' },
      { title: 'Annual Maximum Reached', detail: 'Annual max applies strictly, including orthodontic benefits. Verify remaining benefits before rendering high-value services.' },
    ],
    appealStrategy: [
      'United Concordia is straightforward to appeal — most denials reverse with complete documentation. Build your appeal around the missing item that caused the denial.',
      'Standard written or electronic appeal within 180 days of denial.',
      'For narrative-required denials: submit a clear, concise clinical narrative addressing the specific treatment decision.',
      'For COB denials: attach the primary payer\'s fully adjudicated EOB and verify COB determination before resubmitting.',
      'Decision typically within 30 days. United Concordia\'s fair process means well-documented appeals have high success rates.',
    ],
    feeSchedule: [
      'One of the more dentist-friendly commercial payers — low denial rate and fast processing make cash flow predictable.',
      'Clean claim processing averages 14 days — the fastest of the major payers. Submit complete claims and payment follows quickly.',
      'Annual maximum applies to orthodontic benefits. Verify ortho lifetime max usage before initiating treatment.',
      'Fee schedule is straightforward with minimal LEAT complications compared to Aetna or Cigna.',
    ],
    watchItems: [
      { label: 'X-rays are Non-Negotiable', detail: 'United Concordia\'s #1 denial is missing radiographs. Attach periapical X-rays for every restorative and surgical claim before submitting — do not wait for a request.' },
      { label: 'Pediatric Extraction Narratives', detail: 'Extractions on patients under 18 require a clinical narrative explaining necessity. This is a hard requirement, not optional.' },
      { label: 'COB Attachment Required', detail: 'Secondary claims without the primary EOB attached will be denied every time. Build this into your COB workflow before submitting.' },
      { label: 'Fastest Payer, Highest Clean-Claim ROI', detail: 'If your documentation is complete, United Concordia pays faster than any other major payer. Invest in pre-submission scrubbing to maximize this advantage.' },
    ],
  },
  {
    id: 'humana',
    name: 'Humana',
    nickname: 'The Implant Hard Line',
    trait: 'Highest denial rate (18%) of any major commercial payer in the set — driven by strict implant documentation requirements, pre-auth burden, and eligibility verification failures.',
    badges: ['Highest Denial Rate', 'Implant Documentation Heavy', 'Eligibility Traps'],
    timelyFiling: '90–180 days (plan-dependent)',
    processingTime: '14–21 days',
    appealWindow: '180 days',
    appealMethod: 'Written; phone inquiry first for eligibility issues',
    downcodingRisk: 'High',
    difficulty: 'Very Hard',
    denialTriggers: [
      { title: 'Service Not Covered', detail: 'Most-issued denial. Humana plan benefit structures vary dramatically — verify covered services for the specific plan before rendering treatment.' },
      { title: 'Pre-Authorization Required', detail: 'Required for D6010, D6065, D6066, D4341, D4342, D7310. Missing auth is the most preventable cause of Humana revenue loss.' },
      { title: 'Patient Eligibility Issue', detail: 'Higher-than-average eligibility failures. Verify eligibility on the date of service, not just the date of scheduling.' },
      { title: 'Implants Without Bone Loss Documentation', detail: 'D6010 is denied without radiographic evidence of bone loss, failed tooth documentation, and a clinical necessity narrative. No exceptions.' },
      { title: 'Perio Maintenance Without History', detail: 'D4910 requires documented prior SRP treatment (D4341/D4342) within the expected treatment interval. Perio history must be on file.' },
    ],
    appealStrategy: [
      'For service not covered denials: verify the specific Humana plan document — many Humana plans have narrow covered service lists that differ from the standard benefit summary.',
      'For implant denials: submit a complete implant documentation package — bone loss measurements, pre-op X-rays, failed tooth records, and extraction documentation if applicable.',
      'Written appeal within 180 days. For eligibility issues, call provider relations first to resolve before filing formal appeal.',
      'For perio maintenance: document the full perio treatment history including prior SRP dates, probing depths at time of treatment, and current maintenance interval.',
      "Humana's 18% denial rate means appeals are routine — build appeal templates for their top 3 denial types and train staff to submit same day as denial receipt.",
    ],
    feeSchedule: [
      "Humana's 18% denial rate is the highest among major commercial payers. Build a systematic appeals workflow — this is not optional, it is standard practice for Humana billing.",
      'Pre-auth requirements are extensive: D6010, D6065, D6066, D4341, D4342, D7310. Obtain before every applicable service — retroactive auth is rarely granted.',
      'Plan-to-plan variation is significant. Humana administers employer-sponsored, Medicare Advantage dental, and individual market plans — each has different covered services and fee schedules.',
      'Eligibility verification must happen on the date of service. Humana eligibility changes more frequently than commercial average — coverage gaps and plan changes are a top billing risk.',
    ],
    watchItems: [
      { label: '18% Denial Rate', detail: 'Humana is the highest-denying major payer in this set. Budget time for systematic appeals on every Humana claim. This is expected, not exceptional.' },
      { label: 'Implant Documentation Package Required', detail: 'D6010 without bone loss radiographs, failed tooth records, and clinical necessity narrative: 100% denial rate. Submit the full package on first submission.' },
      { label: 'Eligibility on Date of Service', detail: 'Humana eligibility failures are above average. Re-verify eligibility the morning of the appointment — not at scheduling.' },
      { label: 'Medicare Advantage vs Commercial', detail: 'Humana administers both commercial dental and Medicare Advantage dental plans. Rules, covered services, and fee schedules differ dramatically. Verify which product the patient holds before every claim.' },
    ],
  },
  {
    id: 'medicaid',
    name: 'Medicaid',
    nickname: 'A Different Universe',
    trait: 'State-administered program operating under completely different rules, reimbursements, and requirements than any commercial payer. What is true in one state may be illegal in another.',
    badges: ['State-Specific Rules', 'Balance Billing Illegal', 'Prior Auth Heavy'],
    timelyFiling: '90 days – 12 months (state-dependent)',
    processingTime: '14–30 days (state-dependent)',
    appealWindow: 'Varies by state',
    appealMethod: 'State Medicaid portal (varies by state)',
    downcodingRisk: 'N/A',
    difficulty: 'Very Hard',
    denialTriggers: [
      { title: 'Missing ICD-10 Diagnosis Codes', detail: 'Medicaid programs increasingly require ICD-10 diagnosis codes alongside CDT procedure codes. Missing diagnosis codes are a top denial reason.' },
      { title: 'Prior Authorization Not Obtained', detail: 'Prior authorization is required for many services that commercial payers cover without auth. Obtain auth BEFORE rendering service — retroactive auth is rarely granted.' },
      { title: 'Non-Covered Service', detail: 'Medicaid dental benefits vary dramatically by state. Adult dental is not federally mandated. Many states cover emergency services only.' },
      { title: 'Provider Not in Network', detail: 'Only 41% of US dentists participate in Medicaid. Verify enrollment is current and active in the specific state\'s program.' },
      { title: 'Billing Code Errors', detail: 'Medicaid uses specific code sets that may differ from commercial payers. Some states use ADA codes; others have state-specific modifiers.' },
    ],
    appealStrategy: [
      "Appeal process is state-specific — file through the state's Medicaid portal or managed care organization.",
      'Most states allow 30–90 days from denial to file an appeal.',
      'Medicaid Managed Care: If patient is enrolled in a Medicaid managed care plan, appeal goes to the managed care organization (MCO), not the state directly.',
      'For prior auth denials: appeal on medical necessity grounds with clinical documentation. Retroactive auth requests rarely succeed.',
      'Contact your state dental association for state-specific Medicaid appeal procedures and timelines.',
    ],
    feeSchedule: [
      'Medicaid reimburses approximately 29.9% of average dentist charges nationally. Individual state rates vary significantly above and below this figure.',
      'BALANCE BILLING PATIENTS IS ILLEGAL. Medicaid providers cannot bill patients for the difference between Medicaid reimbursement and standard fees. This is a federal regulation.',
      'Prior authorization required for many services including crowns, extractions, and periodontal treatment — requirements vary by state.',
      'Covered services vary dramatically by state — adult dental benefits are not federally mandated. Some states cover comprehensive care; others cover emergency services only.',
    ],
    watchItems: [
      { label: 'Balance Billing is Federally Illegal', detail: 'Medicaid providers who balance bill patients face federal fraud charges. Under no circumstances bill a Medicaid patient for covered services beyond their copay.' },
      { label: 'State-Specific Everything', detail: 'Covered services, fee schedules, prior auth requirements, timely filing, and appeals processes all vary by state. Do not assume cross-state uniformity.' },
      { label: 'ICD-10 Mandatory and Growing', detail: 'Medicaid programs are rapidly expanding ICD-10 requirements alongside CDT codes. Implement diagnosis coding for all Medicaid claims now, not just when required.' },
      { label: 'Medicare Advantage Dental', detail: 'Medicare Advantage plans include supplemental dental benefits that vary dramatically by plan and carrier. These are NOT the same as Medicaid. Verify each patient\'s specific plan benefits individually.' },
    ],
  },
];

const DOWNCODING_COLORS: Record<string, string> = {
  'Low':       'bg-green-100 text-green-700',
  'Medium':    'bg-amber-100 text-amber-700',
  'High':      'bg-orange-100 text-orange-700',
  'Very High': 'bg-red-100 text-red-700',
  'N/A':       'bg-gray-100 text-gray-500',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  'Easy':      'bg-green-100 text-green-700',
  'Moderate':  'bg-amber-100 text-amber-700',
  'Hard':      'bg-orange-100 text-orange-700',
  'Very Hard': 'bg-red-100 text-red-700',
};

export default function PayerIntelClient() {
  const [activeId, setActiveId] = useState('delta');
  const payer = PAYERS.find(p => p.id === activeId)!;

  return (
    <div className="p-6 space-y-4">

      {/* Payer Tabs */}
      <div className="flex flex-wrap gap-2">
        {PAYERS.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeId === p.id
                ? 'bg-[#5B3FD4] text-white border-[#5B3FD4]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Overview Banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#5B3FD4] uppercase tracking-wider mb-1">{payer.name}</p>
            <h2 className="text-xl font-bold text-gray-900">{payer.nickname}</h2>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">{payer.trait}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DOWNCODING_COLORS[payer.downcodingRisk]}`}>
              Downcoding: {payer.downcodingRisk}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[payer.difficulty]}`}>
              Difficulty: {payer.difficulty}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {payer.badges.map(badge => (
            <span key={badge} className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#E8E4FF] text-[#5B3FD4]">
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Timely Filing Warning + Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Timely Filing Deadline</span>
          </div>
          <p className="text-lg font-bold text-red-700">{payer.timelyFiling}</p>
          <p className="text-xs text-red-500 mt-0.5">from date of service</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Processing Time</p>
          <p className="text-lg font-bold text-gray-900">{payer.processingTime}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Appeal Window</p>
          <p className="text-base font-bold text-gray-900 leading-snug">{payer.appealWindow}</p>
          <p className="text-xs text-gray-500 mt-0.5">{payer.appealMethod}</p>
        </div>
      </div>

      {/* Denial Triggers */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-900">Top Denial Triggers</span>
        </div>
        <div className="divide-y divide-gray-100">
          {payer.denialTriggers.map((trigger, i) => (
            <div key={i} className="flex gap-4 px-5 py-4">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{trigger.title}</p>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{trigger.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appeal Strategy */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <ChevronRight className="h-4 w-4 text-[#5B3FD4] flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-900">Appeal Strategy</span>
        </div>
        <div className="divide-y divide-gray-100">
          {payer.appealStrategy.map((step, i) => (
            <div key={i} className="flex gap-4 px-5 py-4">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E8E4FF] text-[#5B3FD4] text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <TrendingDown className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-900">Fee Schedule & Payment Behavior</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {payer.feeSchedule.map((item, i) => (
            <li key={i} className="flex gap-3 px-5 py-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5B3FD4] mt-2" />
              <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Watch Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <Eye className="h-4 w-4 text-orange-500 flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-900">Watch Items</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 divide-gray-100">
          {payer.watchItems.map((item, i) => (
            <div
              key={i}
              className={`flex gap-3 px-5 py-4 ${i < 2 ? 'sm:border-b sm:border-gray-100' : ''} ${i % 2 === 0 ? 'sm:border-r sm:border-gray-100' : ''}`}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="pt-2 pb-1">
        <h2 className="text-base font-semibold text-gray-900 mb-0.5">Payer Comparison</h2>
        <p className="text-sm text-gray-500">All 7 payers side by side — scroll right on small screens.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Payer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Timely Filing</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Processing</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Appeal Window</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Downcoding Risk</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {PAYERS.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${
                    p.id === activeId ? 'bg-[#F0EEFF]' : ''
                  } ${i === PAYERS.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.timelyFiling}</td>
                  <td className="px-4 py-3 text-gray-600">{p.processingTime}</td>
                  <td className="px-4 py-3 text-gray-600">{p.appealWindow}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOWNCODING_COLORS[p.downcodingRisk]}`}>
                      {p.downcodingRisk}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 px-5 py-3 border-t border-gray-100">
          Click any row to load that payer's full profile above.
        </p>
      </div>

    </div>
  );
}
