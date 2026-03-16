import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/claimguard' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@claimguard.ai' },
    update: {},
    create: {
      email: 'demo@claimguard.ai',
      name: 'Dr. Sarah Johnson',
      password: hashedPassword,
      practice: {
        create: {
          name: 'Sunshine Family Dentistry',
          npi: '1234567890',
          address: '123 Main Street, Dallas, TX 75201',
          state: 'TX',
        },
      },
    },
    include: { practice: true },
  });

  console.log('Created demo user:', user.email);

  // Create payers
  const payersData = [
    {
      payerId: 'DELTA001',
      name: 'Delta Dental',
      state: null,
      denialRate: 0.13,
      avgProcessDays: 18,
      commonDenialReasons: ['Frequency limitation exceeded', 'Missing X-rays for crown procedures', 'Downcoding of restorations'],
      requiresPreAuth: ['D6010', 'D6065', 'D6066', 'D7240', 'D4210', 'D4211'],
      documentationQuirks: ['Requires periapical X-rays within 12 months for crown preps', 'Narratives required for all implant procedures', 'Bitewing frequency: adults every 12 months, children every 6 months'],
    },
    {
      payerId: 'ANTHEM001',
      name: 'Anthem BCBS',
      state: null,
      denialRate: 0.17,
      avgProcessDays: 21,
      commonDenialReasons: ['Not medically necessary', 'Pre-authorization required', 'Bundling/unbundling issues'],
      requiresPreAuth: ['D6010', 'D4341', 'D4342', 'D7310', 'D7320'],
      documentationQuirks: ['Requires clinical notes for perio procedures', 'Crown procedures need full-mouth X-rays or series', 'Implants require bone graft documentation'],
    },
    {
      payerId: 'CIGNA001',
      name: 'Cigna',
      state: null,
      denialRate: 0.15,
      avgProcessDays: 16,
      commonDenialReasons: ['Duplicate claim', 'Patient not eligible on date of service', 'Missing documentation'],
      requiresPreAuth: ['D6010', 'D6065', 'D7240'],
      documentationQuirks: ['Strong preference for PFM crowns over all-ceramic', 'Periodontal procedures require charting within 6 months', 'Orthodontic claims need complete records'],
    },
    {
      payerId: 'AETNA001',
      name: 'Aetna',
      state: null,
      denialRate: 0.14,
      avgProcessDays: 19,
      commonDenialReasons: ['Service not covered under plan', 'Frequency limitation', 'Alternative treatment available'],
      requiresPreAuth: ['D6010', 'D4341', 'D4342', 'D6065', 'D6066'],
      documentationQuirks: ['Requires 6-point perio chart for all SRP procedures', 'Full-mouth X-ray within 36 months required for major services', 'Implants require failed tooth documentation'],
    },
    {
      payerId: 'UNITED001',
      name: 'United Concordia',
      state: null,
      denialRate: 0.11,
      avgProcessDays: 14,
      commonDenialReasons: ['Missing X-rays', 'Narrative required', 'Coordination of benefits'],
      requiresPreAuth: ['D6010', 'D7240', 'D4210'],
      documentationQuirks: ['Fastest payer for clean claims', 'Requires narratives for extractions on patients under 18', 'Annual maximum applies to orthodontic lifetime max'],
    },
    {
      payerId: 'METLIFE001',
      name: 'MetLife',
      state: null,
      denialRate: 0.16,
      avgProcessDays: 22,
      commonDenialReasons: ['Frequency limitation exceeded', 'Missing pre-authorization', 'Incorrect tooth numbering'],
      requiresPreAuth: ['D6010', 'D6065', 'D4341', 'D4342'],
      documentationQuirks: ['Uses proprietary tooth numbering — verify Universal vs Palmer', 'Requires color photographs for ceramic restorations', 'Medical records may be requested for oral surgery'],
    },
    {
      payerId: 'GUARDIAN001',
      name: 'Guardian',
      state: null,
      denialRate: 0.12,
      avgProcessDays: 17,
      commonDenialReasons: ['Not medically necessary', 'Duplicate claim', 'Missing documentation'],
      requiresPreAuth: ['D6010', 'D7240', 'D4210', 'D4211'],
      documentationQuirks: ['Pre-treatment estimates strongly recommended for major work', 'Requires study models for orthodontic cases', 'Crown narratives must include reason for replacement if applicable'],
    },
    {
      payerId: 'HUMANA001',
      name: 'Humana',
      state: null,
      denialRate: 0.18,
      avgProcessDays: 20,
      commonDenialReasons: ['Service not covered', 'Pre-authorization required', 'Patient eligibility issue'],
      requiresPreAuth: ['D6010', 'D6065', 'D6066', 'D4341', 'D4342', 'D7310'],
      documentationQuirks: ['High denial rate for implants without bone loss documentation', 'Requires periodontal maintenance history for new perio patients', 'Medical necessity narratives required for extractions beyond 5 teeth'],
    },
  ];

  for (const payer of payersData) {
    await prisma.payer.upsert({
      where: { payerId: payer.payerId },
      update: payer,
      create: payer,
    });
  }

  console.log('Created 8 payers');

  const practice = user.practice;
  if (!practice) {
    console.error('No practice found');
    return;
  }

  // Sample claims
  const claimsData = [
    {
      patientName: 'Robert Martinez',
      patientDob: new Date('1975-04-12'),
      patientInsuranceId: 'DD-123456789',
      payerId: 'DELTA001',
      payerName: 'Delta Dental',
      planType: 'PPO',
      claimDate: new Date('2026-01-15'),
      serviceDate: new Date('2026-01-10'),
      cdtCodes: ['D2740', 'D0210'],
      diagnosisCodes: ['K02.9'],
      totalAmount: 1450,
      status: 'APPROVED' as const,
      denialRiskScore: 28,
      riskLevel: 'LOW' as const,
      flaggedIssues: [] as string[],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Jennifer Chen',
      patientDob: new Date('1988-09-22'),
      patientInsuranceId: 'ANT-987654321',
      payerId: 'ANTHEM001',
      payerName: 'Anthem BCBS',
      planType: 'PPO',
      claimDate: new Date('2026-01-20'),
      serviceDate: new Date('2026-01-18'),
      cdtCodes: ['D4341', 'D4342', 'D0210'],
      diagnosisCodes: ['K05.3', 'K05.2'],
      totalAmount: 890,
      status: 'DENIED' as const,
      denialRiskScore: 78,
      riskLevel: 'HIGH' as const,
      deniedAt: new Date('2026-02-05'),
      denialReason: 'Missing periodontal charting documentation',
      denialCode: 'B15',
      flaggedIssues: ['Missing 6-point perio chart', 'No clinical notes attached'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Michael Thompson',
      patientDob: new Date('1962-12-01'),
      patientInsuranceId: 'CIG-456789012',
      payerId: 'CIGNA001',
      payerName: 'Cigna',
      planType: 'PPO',
      claimDate: new Date('2026-01-25'),
      serviceDate: new Date('2026-01-22'),
      cdtCodes: ['D6010', 'D6065'],
      diagnosisCodes: ['K08.109'],
      totalAmount: 3200,
      status: 'DENIED' as const,
      denialRiskScore: 85,
      riskLevel: 'CRITICAL' as const,
      deniedAt: new Date('2026-02-10'),
      denialReason: 'Pre-authorization not obtained prior to service',
      denialCode: 'A95',
      flaggedIssues: ['Pre-authorization required for implant procedures', 'Missing bone graft documentation'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Sarah Williams',
      patientDob: new Date('1995-06-15'),
      patientInsuranceId: 'AET-321654987',
      payerId: 'AETNA001',
      payerName: 'Aetna',
      planType: 'HMO',
      claimDate: new Date('2026-02-01'),
      serviceDate: new Date('2026-01-30'),
      cdtCodes: ['D1110', 'D0120', 'D0274'],
      diagnosisCodes: ['Z01.20'],
      totalAmount: 245,
      status: 'APPROVED' as const,
      denialRiskScore: 15,
      riskLevel: 'LOW' as const,
      flaggedIssues: [] as string[],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'David Brown',
      patientDob: new Date('1980-03-28'),
      patientInsuranceId: 'MET-654321098',
      payerId: 'METLIFE001',
      payerName: 'MetLife',
      planType: 'PPO',
      claimDate: new Date('2026-02-05'),
      serviceDate: new Date('2026-02-03'),
      cdtCodes: ['D2750', 'D2140', 'D7140'],
      diagnosisCodes: ['K02.61', 'K08.401'],
      totalAmount: 2100,
      status: 'SUBMITTED' as const,
      denialRiskScore: 45,
      riskLevel: 'MEDIUM' as const,
      flaggedIssues: ['Verify tooth numbering system', 'Ceramic restoration may require photos'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Lisa Anderson',
      patientDob: new Date('1970-11-08'),
      patientInsuranceId: 'GRD-789012345',
      payerId: 'GUARDIAN001',
      payerName: 'Guardian',
      planType: 'PPO',
      claimDate: new Date('2026-02-10'),
      serviceDate: new Date('2026-02-07'),
      cdtCodes: ['D4341', 'D4342', 'D4910'],
      diagnosisCodes: ['K05.3'],
      totalAmount: 1350,
      status: 'APPEALING' as const,
      denialRiskScore: 72,
      riskLevel: 'HIGH' as const,
      deniedAt: new Date('2026-02-25'),
      denialReason: 'Frequency limitation: periodontal maintenance within 6 months',
      denialCode: 'B17',
      flaggedIssues: ['Frequency limitation conflict', 'D4910 within 6 months of prior SRP'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'James Wilson',
      patientDob: new Date('1958-07-19'),
      patientInsuranceId: 'HUM-234567890',
      payerId: 'HUMANA001',
      payerName: 'Humana',
      planType: 'PPO',
      claimDate: new Date('2026-02-15'),
      serviceDate: new Date('2026-02-12'),
      cdtCodes: ['D7210', 'D7140', 'D0210'],
      diagnosisCodes: ['K08.409', 'K01.1'],
      totalAmount: 780,
      status: 'PENDING' as const,
      denialRiskScore: 38,
      riskLevel: 'MEDIUM' as const,
      flaggedIssues: ['Narrative recommended for multiple extractions'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Patricia Davis',
      patientDob: new Date('1985-01-30'),
      patientInsuranceId: 'UC-345678901',
      payerId: 'UNITED001',
      payerName: 'United Concordia',
      planType: 'PPO',
      claimDate: new Date('2026-02-20'),
      serviceDate: new Date('2026-02-18'),
      cdtCodes: ['D2740', 'D0330'],
      diagnosisCodes: ['K02.9', 'K08.89'],
      totalAmount: 1680,
      status: 'APPEAL_WON' as const,
      denialRiskScore: 55,
      riskLevel: 'MEDIUM' as const,
      deniedAt: new Date('2026-03-01'),
      denialReason: 'Alternative treatment available at lower cost',
      denialCode: 'B12',
      flaggedIssues: ['Alternative treatment available', 'Panoramic X-ray bundling'],
      suggestedCdtCodes: ['D2750'],
    },
    {
      patientName: 'Thomas Moore',
      patientDob: new Date('1992-05-14'),
      patientInsuranceId: 'DD-567890123',
      payerId: 'DELTA001',
      payerName: 'Delta Dental',
      planType: 'PPO',
      claimDate: new Date('2026-02-28'),
      serviceDate: new Date('2026-02-25'),
      cdtCodes: ['D1110', 'D0120', 'D0274', 'D2140'],
      diagnosisCodes: ['Z01.20', 'K02.51'],
      totalAmount: 385,
      status: 'APPROVED' as const,
      denialRiskScore: 12,
      riskLevel: 'LOW' as const,
      flaggedIssues: [] as string[],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Nancy Taylor',
      patientDob: new Date('1967-09-03'),
      patientInsuranceId: 'ANT-678901234',
      payerId: 'ANTHEM001',
      payerName: 'Anthem BCBS',
      planType: 'PPO',
      claimDate: new Date('2026-03-01'),
      serviceDate: new Date('2026-02-28'),
      cdtCodes: ['D4341', 'D0210', 'D9310'],
      diagnosisCodes: ['K05.3', 'K05.2'],
      totalAmount: 1120,
      status: 'PENDING' as const,
      denialRiskScore: 65,
      riskLevel: 'HIGH' as const,
      flaggedIssues: ['Clinical consultation code may be bundled', 'Perio chart must be current'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Charles Jackson',
      patientDob: new Date('1978-12-20'),
      patientInsuranceId: 'CIG-789012345',
      payerId: 'CIGNA001',
      payerName: 'Cigna',
      planType: 'PPO',
      claimDate: new Date('2026-03-05'),
      serviceDate: new Date('2026-03-03'),
      cdtCodes: ['D2750', 'D2950', 'D0220'],
      diagnosisCodes: ['K08.89', 'K02.9'],
      totalAmount: 1890,
      status: 'DRAFT' as const,
      denialRiskScore: 42,
      riskLevel: 'MEDIUM' as const,
      flaggedIssues: ['Verify all-ceramic vs PFM coverage', 'Core buildup documentation needed'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Betty Harris',
      patientDob: new Date('1955-08-11'),
      patientInsuranceId: 'AET-890123456',
      payerId: 'AETNA001',
      payerName: 'Aetna',
      planType: 'Medicare',
      claimDate: new Date('2026-03-08'),
      serviceDate: new Date('2026-03-06'),
      cdtCodes: ['D7210', 'D7310', 'D9930'],
      diagnosisCodes: ['K08.409'],
      totalAmount: 1230,
      status: 'SUBMITTED' as const,
      denialRiskScore: 58,
      riskLevel: 'MEDIUM' as const,
      flaggedIssues: ['Alveoloplasty may be considered incidental', 'Occlusal guard medical necessity needed'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Kevin Lewis',
      patientDob: new Date('2001-02-14'),
      patientInsuranceId: 'MET-901234567',
      payerId: 'METLIFE001',
      payerName: 'MetLife',
      planType: 'PPO',
      claimDate: new Date('2026-03-10'),
      serviceDate: new Date('2026-03-08'),
      cdtCodes: ['D0150', 'D1110', 'D2391'],
      diagnosisCodes: ['Z01.20', 'K02.3'],
      totalAmount: 325,
      status: 'PENDING' as const,
      denialRiskScore: 20,
      riskLevel: 'LOW' as const,
      flaggedIssues: [] as string[],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Amanda Robinson',
      patientDob: new Date('1983-06-27'),
      patientInsuranceId: 'GRD-012345678',
      payerId: 'GUARDIAN001',
      payerName: 'Guardian',
      planType: 'PPO',
      claimDate: new Date('2026-03-12'),
      serviceDate: new Date('2026-03-10'),
      cdtCodes: ['D6010', 'D6065', 'D6058', 'D0330'],
      diagnosisCodes: ['K08.109', 'K08.29'],
      totalAmount: 4500,
      status: 'DRAFT' as const,
      denialRiskScore: 88,
      riskLevel: 'CRITICAL' as const,
      flaggedIssues: ['Pre-authorization required', 'Missing bone loss documentation', 'No failed tooth X-ray on file', 'Pre-treatment estimate recommended'],
      suggestedCdtCodes: [] as string[],
    },
    {
      patientName: 'Donald White',
      patientDob: new Date('1950-04-05'),
      patientInsuranceId: 'HUM-123456780',
      payerId: 'HUMANA001',
      payerName: 'Humana',
      planType: 'Medicare',
      claimDate: new Date('2026-03-14'),
      serviceDate: new Date('2026-03-12'),
      cdtCodes: ['D4342', 'D4910', 'D0210'],
      diagnosisCodes: ['K05.2'],
      totalAmount: 675,
      status: 'PENDING' as const,
      denialRiskScore: 48,
      riskLevel: 'MEDIUM' as const,
      flaggedIssues: ['Verify Medicare coverage for perio services', 'Maintenance history required'],
      suggestedCdtCodes: [] as string[],
    },
  ];

  for (const claimData of claimsData) {
    await prisma.claim.create({
      data: {
        ...claimData,
        practiceId: practice.id,
      },
    });
  }

  console.log('Created 15 sample claims');

  // Create appeals for denied/appealing claims
  const deniedClaims = await prisma.claim.findMany({
    where: {
      practiceId: practice.id,
      status: { in: ['DENIED', 'APPEALING', 'APPEAL_WON'] },
    },
  });

  const appealTemplates = [
    {
      letterContent: `[DATE]

Appeals Department
Anthem Blue Cross Blue Shield
P.O. Box 105187
Atlanta, GA 30348-5187

RE: Appeal of Claim Denial — Jennifer Chen
Member ID: ANT-987654321
Date of Service: January 18, 2026
Claim Reference: [REFERENCE NUMBER]
Denial Code: B15 — Missing Documentation

Dear Appeals Department,

I am writing on behalf of Jennifer Chen to formally appeal the denial of the above-referenced dental claim for periodontal scaling and root planing (D4341, D4342) performed on January 18, 2026.

CLINICAL JUSTIFICATION

Ms. Chen presented with a diagnosis of moderate generalized chronic periodontitis (K05.3) with documented pocket depths ranging from 4-7mm in multiple quadrants. The American Academy of Periodontology (AAP) clinical practice guidelines clearly support scaling and root planing as the standard of care for Stage II-III periodontitis with probing depths exceeding 4mm.

A comprehensive 6-point periodontal chart was completed at the time of examination on January 15, 2026, documenting the clinical parameters necessitating active periodontal therapy. This documentation is enclosed with this appeal.

RESPONSE TO DENIAL

The denial reason cited "missing periodontal charting documentation." We have enclosed the complete periodontal chart, clinical notes from the examination appointment, and pre-operative radiographs demonstrating bone loss consistent with the diagnosis. The periodontal chart reflects the clinical findings that directly support the medical necessity of the procedures performed.

SUPPORTING DOCUMENTATION ENCLOSED:
- Complete 6-point periodontal chart dated January 15, 2026
- Clinical examination notes with diagnosis documentation
- Full-mouth radiographic series (D0210) taken January 18, 2026
- Treatment plan signed by patient

REGULATORY NOTICE

This claim is subject to ERISA regulations as an employer-sponsored benefit plan. Under 29 C.F.R. § 2560.503-1, we request a full and fair review of this claim within 60 days of this appeal.

We respectfully request that you reconsider this denial and process the claim for the full billed amount of $890.00. Please respond within 30 days of receipt of this letter.

Sincerely,

[PROVIDER NAME]
[PROVIDER NPI]
Sunshine Family Dentistry
123 Main Street, Dallas, TX 75201`,
      status: 'SUBMITTED' as const,
    },
    {
      letterContent: `[DATE]

Pre-Authorization Appeals Unit
Cigna Dental
P.O. Box 188037
Chattanooga, TN 37422

RE: Appeal — Unauthorized Implant Claim
Patient: Michael Thompson
Member ID: CIG-456789012
Date of Service: January 22, 2026
Denial Code: A95 — Pre-authorization Not Obtained

Dear Pre-Authorization Appeals Unit,

This letter constitutes a formal first-level appeal for the denial of implant services (D6010, D6065) rendered to Michael Thompson on January 22, 2026. The services were denied on the basis that pre-authorization was not obtained prior to service delivery.

URGENT CLINICAL CIRCUMSTANCES

Mr. Thompson, a 63-year-old patient, presented as a dental emergency following traumatic loss of tooth #19 due to a fractured root. The clinical circumstances required immediate extraction, and the implant placement procedure was performed in the same surgical appointment to preserve the alveolar bone and minimize future grafting requirements — a clinically sound and evidence-based approach supported by the ITI (International Team for Implantology) guidelines on immediate implant placement.

CLINICAL NECESSITY

Delayed implant placement in this region presents significant risks including:
- Rapid alveolar bone resorption (60-70% reduction in width within 3 months)
- Sinus pneumatization requiring more complex future procedures
- Greater patient morbidity from multiple surgical interventions

The immediate placement protocol represents the most conservative and clinically appropriate treatment, resulting in lower overall cost to the plan.

SUPPORTING DOCUMENTATION ENCLOSED:
- Operative note documenting emergency nature of presentation
- Pre-operative radiographs showing fractured root
- Post-operative radiographs confirming proper implant positioning
- Referral documentation (if applicable)
- Patient consent forms

We request full reimbursement of $3,200.00 within 30 days. Please contact our office at [PHONE NUMBER] with any questions.

Respectfully submitted,

[PROVIDER NAME]
[PROVIDER NPI]`,
      status: 'SUBMITTED' as const,
    },
    {
      letterContent: `[DATE]

Claims Appeals Department
Guardian Life Insurance
P.O. Box 26030
Lehigh Valley, PA 18002

RE: Appeal of Claim Denial — Lisa Anderson
Member ID: GRD-789012345
Date of Service: February 7, 2026
Denial Code: B17 — Frequency Limitation

Dear Appeals Department,

We are writing to appeal the denial of periodontal maintenance (D4910) and active periodontal therapy (D4341, D4342) for Lisa Anderson, rendered on February 7, 2026.

CLINICAL OVERVIEW

Ms. Anderson has a documented history of aggressive periodontitis (Stage III, Grade B) requiring close monitoring and more frequent maintenance intervals as recommended by the American Academy of Periodontology. Her prior treatment history includes active SRP completed in August 2025, with the current maintenance visit falling within the clinically appropriate 4-6 month interval.

RESPONSE TO FREQUENCY LIMITATION DENIAL

Guardian's standard frequency limitation of one periodontal maintenance visit per 6 months may apply to patients with stable periodontal health. However, AAP guidelines (2017 Classification System) recognize that patients with Stage III periodontitis require maintenance intervals of 3-4 months to prevent disease progression and tooth loss.

Ms. Anderson's current visit at 6 months post-SRP is consistent with the minimum maintenance threshold for her condition. The clinical rationale for this frequency is documented in the enclosed periodontal chart showing residual pocketing of 4-5mm in posterior sextants.

SUPPORTING DOCUMENTATION ENCLOSED:
- Periodontal chart from February 7, 2026 showing current pocket depths
- Prior periodontal chart from August 2025 for comparison
- Clinical notes documenting disease severity and maintenance rationale
- AAP clinical practice guideline reference (enclosed)

We respectfully request payment of the full claim amount of $1,350.00. Please respond within 30 days.

Respectfully,

[PROVIDER NAME]
[PROVIDER NPI]
Sunshine Family Dentistry`,
      status: 'DRAFT' as const,
    },
  ];

  for (let i = 0; i < deniedClaims.length && i < appealTemplates.length; i++) {
    const claim = deniedClaims[i];
    const template = appealTemplates[i];

    const appealStatus = claim.status === 'APPEAL_WON' ? ('WON' as const) : template.status;

    await prisma.appeal.upsert({
      where: { claimId: claim.id },
      update: {},
      create: {
        claimId: claim.id,
        letterContent: template.letterContent,
        status: appealStatus,
        submittedAt: appealStatus !== 'DRAFT' ? new Date('2026-02-28') : null,
        amountRecovered: claim.status === 'APPEAL_WON' ? claim.totalAmount : null,
        resolvedAt: claim.status === 'APPEAL_WON' ? new Date('2026-03-08') : null,
        resolution: claim.status === 'APPEAL_WON' ? 'Appeal approved, full payment issued' : null,
      },
    });
  }

  console.log('Created appeals for denied claims');
  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
