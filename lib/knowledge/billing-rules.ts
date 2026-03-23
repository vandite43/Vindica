/**
 * billing-rules.ts
 * Static text constants injected into AI prompts as part of the [KNOWLEDGE BASE].
 * Each export is a ready-to-inject text block.
 */

export const BUNDLING_MASTER = `
BUNDLING RULES — NEVER BILL THESE TOGETHER:
• D7140 or D7210 + D9215: Local anesthesia is always included in extractions — never bill separately
• Any crown code (D2740/D2750) + D2950 without retention narrative: Core buildup bundled into crown unless narrative explicitly states retention purpose
• D0210 (FMX) + D0220/D0230 same date: FMX includes all periapical images — cannot bill individual periapicals same day as FMX
• D1110 + D4910 same date: Cannot bill prophy and perio maintenance on same visit
• D3120 + same-date restoration: Pulp cap always included in restoration fee — only billable standalone on a different date
• D0120 + D0150 same date: Cannot bill two evaluations on the same day
• D4341/D4342 + D1110 same date: Prophy will be denied when billed with SRP
• Any crown + temporary restoration code: Temp always included in crown fee
• Any crown + impression code: Impressions always included in crown fee
• D4355 + D1110 same date: Full mouth debridement and prophy cannot be billed together
• Any restoration + acid etch/adhesive codes: Always included in composite restorations
• D7220/D7230/D7240 + D9215: Local anesthesia always included in surgical impaction removal
`.trim();

export const TIMELY_FILING = `
TIMELY FILING DEADLINES BY PAYER:
• Delta Dental: 12–18 months (varies by state affiliate)
• BCBS: 365 days typical (varies by state affiliate)
• Cigna: 90 days (participating) / 180 days (non-participating)
• Aetna: 90 days (clean claim, participating)
• MetLife: 12 months
• UnitedHealthcare: 90–180 days (plan-dependent)
• Humana: 180 days
• Guardian: 180 days
• Medicaid: 90 days to 12 months (state-dependent — know your state deadline)
• Medicare: 12 months (calendar year)

⚠ CO-29 TIMELY FILING EXPIRED: Generally NON-APPEALABLE. Permanent revenue loss.
Narrow exceptions only: documented system error, payer-caused delay, retroactive eligibility change, or natural disaster.
Filing deadline tracking must be audited immediately when CO-29 appears.
`.trim();

export const CARC_DENIAL_CODES = `
CARC DENIAL CODE ACTION GUIDE:

CO-4 — Procedure code inconsistent with modifier
Action: Verify place of service and procedure code combination. Correct and resubmit.

CO-11 — Diagnosis inconsistent with procedure
Action: Add or correct ICD-10 diagnosis code. Resubmit.

CO-16 — Missing information or billing error
Action: Most common front-end denial. Check patient name, DOB, subscriber ID, NPI, auth number. Fix and resubmit same day.
Overturn rate: ~78% when corrected

CO-18 — Duplicate claim
Action: Check clearinghouse for original claim status before resubmitting.

CO-22 — Coordination of Benefits (COB) issue
Action: Verify COB determination. Apply birthday rule for dependents. Confirm primary payer adjudicated first. Attach primary EOB.

CO-29 — Timely filing expired
Action: Generally non-appealable. Permanent revenue loss. Narrow exceptions: system error, payer-caused delay, retroactive eligibility, natural disaster. Audit timely filing tracking immediately.

CO-45 — Charges exceed contracted fee
Action: In-network — accept contracted rate and post write-off. Out-of-network — may bill patient balance.

CO-50 — Not medically necessary
Action: Gather comprehensive clinical documentation beyond original submission. Detailed doctor narrative with specific measurements. Labeled intraoral photos. ADA standard of care references.
Overturn rate: ~70% with strong documentation

CO-96 — Non-covered charge
Action: Verify true plan exclusion vs documentation issue. If truly excluded, bill patient. If covered, appeal with clinical justification.
Overturn rate: ~35%

CO-97 — Service included in another procedure (bundled)
Action: IMPORTANT — this often means insufficient documentation, not a true bundle. Gather documentation showing procedures are clinically distinct. Appeal with clinical narrative.
Overturn rate: ~55%

CO-119 — Benefit maximum reached
Action: Bill patient balance. Inform patients of annual maximum during financial counseling.
Appealable: No

CO-151 / N640 — Frequency limitation exceeded
Action: Verify benefit year dates — calendar year vs rolling 12 months vs benefit year. Check if patient received service at another office within frequency window.

OA-23 — Pre-authorization required
Action: Obtain retro-auth if payer allows. Appeal on urgency basis with clinical documentation.
Overturn rate: ~65%
`.trim();

export const APPEAL_STRATEGY = `
APPEAL STRATEGY — WINNING ELEMENTS:
• Clinical documentation exceeding the original submission
• Doctor narrative beyond chart notes (chart notes were already denied — they need MORE)
• Specific clinical findings with exact measurements (pocket depths, bone loss percentage, fracture dimensions)
• Labeled intraoral photos with arrows pointing to pathology
• ADA or AAP standard of care guideline references with year and publication
• Specialist prognosis reports when applicable
• NEVER use the same language that the denial used

COUNTER-LANGUAGE RULES:
If denial says: "normal attrition and wear"
Appeal must use: "craze line fractures, fracture lines, dentin exposure, cold sensitivity"

If denial says: "cosmetic procedure"
Appeal must use: "functionally necessary, restoring proper occlusal function"

If denial says: "not medically necessary"
Appeal must use: "meets standard of care, clinically indicated, necessary to prevent further destruction"

BANNED WORDS (trigger denials — never use in narratives or appeal letters):
erosion, abrasion, attrition, wear, bruxism, cosmetic, esthetic, aesthetics,
patient desires, patient requested, patient wants, poor prognosis, prophylactic,
elective, appearance, smile enhancement, normal wear, generalized wear

APPROVED WORDS (get paid — use these instead):
fractured, recurrent decay, failing restoration, loss of tooth structure, non-restorable,
craze line cracks, fracture lines, dentin exposure, cold sensitivity, bone loss,
subgingival extension, less than 50% structure remains, clinically indicated, standard of care

ERISA APPEAL RIGHTS (employer-sponsored plans):
• Plans must provide written denial with specific reasons (ERISA Section 503)
• Minimum 180 days to appeal
• Appeals reviewed by independent reviewer
• Clinical appeals reviewed by qualified healthcare professional
• 29 CFR § 2560.503-1(l): if plan fails to follow compliant procedures, claimant is deemed to have exhausted administrative remedies and can immediately file suit

ERISA APPEAL LANGUAGE TO INCLUDE:
"Pursuant to 29 CFR § 2560.503-1(h), we request a full and fair review of this claim denial. Under ERISA Section 503, we are entitled to receive, free of charge, all documents and records relevant to this claim."

PAYER-SPECIFIC APPEAL CHANNELS:
• Cigna: Call BEFORE submitting formal appeal — many denials resolved by phone. Window: 180 days (365 days California)
• Aetna: Request peer-to-peer with dental consultant BEFORE formal appeal. Fax: 1-877-867-8729. Window: 180 days
• MetLife: Writing ONLY — no phone or electronic appeals accepted. Window: 180 days, decision within 30 days
• UnitedHealthcare: Reconsideration FIRST (one only), then formal appeal if denied. DO NOT skip reconsideration. Window: 120-180 days by plan
• Delta Dental: Standard written appeal. Window: 180 days, second appeal 60 days
`.trim();

export const COB_RULES = `
COORDINATION OF BENEFITS (COB) RULES:

BIRTHDAY RULE (for dependents):
The parent whose birthday falls FIRST in the calendar year (not the older parent) = primary insurer.
Example: Parent A born March 15, Parent B born August 3 → Parent A's plan is primary regardless of age.

SUBSCRIBER RULE:
The plan where the patient is the named subscriber = primary.

MEDICAID: Always payer of last resort — all other coverage is primary before Medicaid.

COB METHODS (vary by plan):
• Traditional COB: Secondary pays up to 100% of total charges combined — no patient liability
• Maintenance of Benefits: Secondary reduces its payment by the primary payment amount, then applies its own cost-sharing
• Non-Duplication: Secondary pays nothing if primary already covered what the secondary would have paid. Common in self-funded ERISA plans — read the plan documents.

NPI RULES:
• Type 1 NPI: Individual provider (rendering dentist) — goes in Box 54
• Type 2 NPI: Organization/billing entity — goes in Box 49
• Submitting wrong type in wrong field = claim rejection
• Every rendering provider must be linked to the billing entity in payer credentialing systems
• New providers not yet credentialed with a payer = out-of-network surprise = patient relations damage and revenue loss
`.trim();

export const AR_PRIORITY_RULES = `
AR FOLLOW-UP PRIORITY HIERARCHY:
1. TIMELY FILING DEADLINE UNDER 30 DAYS — Work FIRST regardless of dollar amount. Once CO-29 is posted, revenue is permanently lost.
2. 90+ DAY CLAIMS OVER $500 — Only 15–25% collectible. Escalate immediately.
3. 61–90 DAY CLAIMS OVER $500 — At risk of becoming uncollectable. Follow up now.
4. Within each aging bucket: crowns, bridges, implants, and surgery before preventive
5. 0–30 DAY CLAIMS — Monitor only unless a denial has been received

AR GOLDEN RULES:
• Submit claims within 1 business day of treatment
• Never let a rejection sit more than 24 hours
• Only 33% of denied claims are ever appealed — appeal everything appropriate
• 65% of denied claims are never resubmitted — this is the biggest revenue leak in dental billing
• Document every follow-up call: date, time, rep name, reference number, outcome
`.trim();

export const KPI_BENCHMARKS = `
DENTAL BILLING KPI BENCHMARKS:
• Clean claim rate target: >95–98% (industry average: ~85%)
• Denial rate target: <5% (industry average: ~15%)
• Days in AR target: <30–35 days
• Collection rate target: 98% of adjusted production
• AR over 90 days: <3% of total AR
• Write-off rate: keep below 20% of PPO fees (average practice writes off ~40% — negotiate with Provider Relations when write-offs exceed 20%)
`.trim();
