import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { encrypt } from '../lib/security/encrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/claimguard' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 12);
  // Upsert the owner user first (without practice, to avoid nested-create on re-runs)
  let user = await prisma.user.upsert({
    where: { email: 'demo@claimguard.ai' },
    update: { mfaEnabled: false, role: 'SUPER_ADMIN' },
    create: {
      email: 'demo@claimguard.ai',
      name: 'Dr. Sarah Johnson',
      password: hashedPassword,
      mfaEnabled: false,
      role: 'SUPER_ADMIN',
    },
  });

  // Upsert the practice (owner = demo user)
  const practice = await prisma.practice.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      name: 'Sunshine Family Dentistry',
      npi: '1234567890',
      address: '123 Main Street, Dallas, TX 75201',
      state: 'TX',
      userId: user.id,
    },
  });

  // Always ensure the owner user has practiceId set (idempotent)
  if (user.practiceId !== practice.id) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { practiceId: practice.id },
    });
  }

  console.log('Created demo user:', user.email);

  // Create demo member accounts (one per role) linked to the same practice
  const practiceId = practice.id;
  const memberAccounts = [
    { email: 'demo.admin@claimguard.ai',    name: 'Alex Rivera',     role: 'ADMIN'          },
    { email: 'demo.office@claimguard.ai',   name: 'Morgan Lee',      role: 'OFFICE_MANAGER' },
    { email: 'demo.biller@claimguard.ai',   name: 'Jamie Chen',      role: 'BILLER'         },
  ];
  for (const acct of memberAccounts) {
    await (prisma as any).user.upsert({
      where: { email: acct.email },
      update: { mfaEnabled: false },
      create: {
        email:      acct.email,
        name:       acct.name,
        password:   hashedPassword,
        role:       acct.role,
        mfaEnabled: false,
        practiceId,
      },
    });
    console.log('Created demo member:', acct.email);
  }

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
    const { patientName, patientDob, patientInsuranceId, diagnosisCodes, ...rest } = claimData;
    await prisma.claim.create({
      data: {
        ...rest,
        practiceId:         practice.id,
        patientName:        encrypt(patientName),
        patientDob:         encrypt((patientDob as Date).toISOString()),
        patientInsuranceId: encrypt(patientInsuranceId),
        diagnosisCodes:     encrypt(JSON.stringify(diagnosisCodes)),
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
        letterContent: encrypt(template.letterContent),
        status: appealStatus,
        submittedAt: appealStatus !== 'DRAFT' ? new Date('2026-02-28') : null,
        amountRecovered: claim.status === 'APPEAL_WON' ? claim.totalAmount : null,
        resolvedAt: claim.status === 'APPEAL_WON' ? new Date('2026-03-08') : null,
        resolution: claim.status === 'APPEAL_WON' ? 'Appeal approved, full payment issued' : null,
      },
    });
  }

  console.log('Created appeals for denied claims');

  // ── Seed Providers ──────────────────────────────────────────────────────────
  const providerPractice = user.practice!;
  const existingProviders = await prisma.provider.count({ where: { practiceId: providerPractice.id } });

  if (existingProviders === 0) {
    const now = new Date();
    const in45 = new Date(now); in45.setDate(now.getDate() + 45);
    const in90 = new Date(now); in90.setDate(now.getDate() + 90);
    const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);
    const twoYearsAgo = new Date(now); twoYearsAgo.setFullYear(now.getFullYear() - 2);
    const fiveYearsAgo = new Date(now); fiveYearsAgo.setFullYear(now.getFullYear() - 5);
    const pastExpiry = new Date(now); pastExpiry.setDate(now.getDate() - 30);
    const oneYearHence = new Date(now); oneYearHence.setFullYear(now.getFullYear() + 1);
    const twoYearsHence = new Date(now); twoYearsHence.setFullYear(now.getFullYear() + 2);

    // Provider 1: Dr. Sarah Johnson — mostly credentialed, one credential expiring in 45 days
    const p1 = await prisma.provider.create({
      data: {
        practiceId: providerPractice.id,
        firstName: 'Sarah', lastName: 'Johnson', credentials: 'DDS',
        npiType1: '1234567891', licenseNumber: 'D-48291', licenseState: 'TX',
        licenseExpiry: twoYearsHence, deaNumber: 'BJ1234567',
        specialty: 'General Dentistry', startDate: fiveYearsAgo,
        credentialing: {
          create: [
            { payerName: 'Delta Dental',       payerId: 'DELTA001',   status: 'CREDENTIALED',     approvalDate: new Date('2022-01-15'), expiryDate: oneYearHence,  contractType: 'PPO', providerNumber: 'DD-88421' },
            { payerName: 'Cigna',              payerId: 'CIGNA001',   status: 'CREDENTIALED',     approvalDate: new Date('2022-02-01'), expiryDate: in45,          contractType: 'PPO', providerNumber: 'CG-55201' },
            { payerName: 'Aetna',              payerId: 'AETNA001',   status: 'CREDENTIALED',     approvalDate: new Date('2022-01-20'), expiryDate: oneYearHence,  contractType: 'PPO', providerNumber: 'AE-29301' },
            { payerName: 'MetLife',            payerId: 'METLIFE001', status: 'CREDENTIALED',     approvalDate: new Date('2022-03-10'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'ML-71040' },
            { payerName: 'UnitedHealthcare',   payerId: 'UHC001',     status: 'CREDENTIALED',     approvalDate: new Date('2022-02-15'), expiryDate: oneYearHence,  contractType: 'PPO', providerNumber: 'UHC-33891' },
            { payerName: 'Guardian',           payerId: 'GUARD001',   status: 'CREDENTIALED',     approvalDate: new Date('2022-04-01'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'GD-12045' },
            { payerName: 'Humana',             payerId: 'HUMANA001',  status: 'CREDENTIALED',     approvalDate: new Date('2022-03-01'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'HU-88302' },
            { payerName: 'BCBS',               payerId: 'BCBS001',    status: 'CREDENTIALED',     approvalDate: new Date('2022-02-20'), expiryDate: oneYearHence,  contractType: 'PPO', providerNumber: 'BC-44510' },
            { payerName: 'Medicaid (State)',    payerId: 'MCAID001',   status: 'CREDENTIALED',     approvalDate: new Date('2022-05-01'), expiryDate: oneYearHence,  contractType: 'Medicaid', providerNumber: 'TX-990221' },
            { payerName: 'Medicare Advantage', payerId: 'MCARE001',   status: 'NOT_STARTED',      notes: 'Practice opted out of Medicare Advantage' },
          ],
        },
        events: {
          create: [
            { payerName: 'Cigna', event: 'Renewal notice received — expiring in 45 days', updatedBy: 'demo@claimguard.ai', createdAt: new Date(now.getTime() - 86400000 * 5) },
            { payerName: 'Delta Dental', event: 'Annual re-attestation completed on CAQH', updatedBy: 'demo@claimguard.ai', createdAt: new Date(now.getTime() - 86400000 * 30) },
          ],
        },
      },
    });

    // Provider 2: Dr. Marcus Rivera — new provider (3 months ago), mix of IN_PROCESS and NOT_STARTED
    const p2 = await prisma.provider.create({
      data: {
        practiceId: providerPractice.id,
        firstName: 'Marcus', lastName: 'Rivera', credentials: 'DMD',
        npiType1: '9876543210', licenseNumber: 'D-51872', licenseState: 'TX',
        licenseExpiry: twoYearsHence, specialty: 'Oral Surgery', startDate: threeMonthsAgo,
        credentialing: {
          create: [
            { payerName: 'Delta Dental',       payerId: 'DELTA001',   status: 'IN_PROCESS',       applicationDate: new Date(threeMonthsAgo.getTime() + 86400000 * 5), notes: 'Submitted via CAQH. Follow up due next week.' },
            { payerName: 'Cigna',              payerId: 'CIGNA001',   status: 'IN_PROCESS',       applicationDate: new Date(threeMonthsAgo.getTime() + 86400000 * 7) },
            { payerName: 'Aetna',              payerId: 'AETNA001',   status: 'APPLICATION_SENT', applicationDate: new Date(threeMonthsAgo.getTime() + 86400000 * 10) },
            { payerName: 'MetLife',            payerId: 'METLIFE001', status: 'APPLICATION_SENT', applicationDate: new Date(threeMonthsAgo.getTime() + 86400000 * 10) },
            { payerName: 'UnitedHealthcare',   payerId: 'UHC001',     status: 'NOT_STARTED' },
            { payerName: 'Guardian',           payerId: 'GUARD001',   status: 'NOT_STARTED' },
            { payerName: 'Humana',             payerId: 'HUMANA001',  status: 'NOT_STARTED' },
            { payerName: 'BCBS',               payerId: 'BCBS001',    status: 'NOT_STARTED' },
            { payerName: 'Medicaid (State)',    payerId: 'MCAID001',   status: 'NOT_STARTED' },
            { payerName: 'Medicare Advantage', payerId: 'MCARE001',   status: 'NOT_STARTED' },
          ],
        },
        events: {
          create: [
            { event: 'Provider hired. Credentialing process started for all major payers.', updatedBy: 'demo@claimguard.ai', createdAt: threeMonthsAgo },
            { payerName: 'Delta Dental', event: 'Application submitted via CAQH ProView. Confirmation received.', updatedBy: 'demo@claimguard.ai', createdAt: new Date(threeMonthsAgo.getTime() + 86400000 * 5) },
            { payerName: 'Cigna', event: 'Follow-up call placed. Rep confirmed receipt. Est. 60-90 day processing.', updatedBy: 'demo@claimguard.ai', createdAt: new Date(threeMonthsAgo.getTime() + 86400000 * 21) },
          ],
        },
      },
    });

    // Provider 3: Dr. Lisa Chen — RDH, mostly credentialed, one EXPIRED credential
    const p3 = await prisma.provider.create({
      data: {
        practiceId: providerPractice.id,
        firstName: 'Lisa', lastName: 'Chen', credentials: 'RDH',
        npiType1: '5551234567', licenseNumber: 'RDH-22841', licenseState: 'TX',
        licenseExpiry: oneYearHence, specialty: 'Dental Hygiene', startDate: twoYearsAgo,
        credentialing: {
          create: [
            { payerName: 'Delta Dental',       payerId: 'DELTA001',   status: 'CREDENTIALED', approvalDate: new Date('2023-03-01'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'DD-55102' },
            { payerName: 'Cigna',              payerId: 'CIGNA001',   status: 'CREDENTIALED', approvalDate: new Date('2023-03-15'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'CG-88731' },
            { payerName: 'Aetna',              payerId: 'AETNA001',   status: 'EXPIRED',      approvalDate: new Date('2023-04-01'), expiryDate: pastExpiry,    contractType: 'PPO', providerNumber: 'AE-19022', notes: 'Renewal in progress. Do not submit claims.' },
            { payerName: 'MetLife',            payerId: 'METLIFE001', status: 'CREDENTIALED', approvalDate: new Date('2023-04-10'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'ML-30041' },
            { payerName: 'UnitedHealthcare',   payerId: 'UHC001',     status: 'CREDENTIALED', approvalDate: new Date('2023-05-01'), expiryDate: oneYearHence,  contractType: 'PPO', providerNumber: 'UHC-77120' },
            { payerName: 'Guardian',           payerId: 'GUARD001',   status: 'CREDENTIALED', approvalDate: new Date('2023-05-15'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'GD-56201' },
            { payerName: 'Humana',             payerId: 'HUMANA001',  status: 'NOT_STARTED',  notes: 'Low volume — deferred' },
            { payerName: 'BCBS',               payerId: 'BCBS001',    status: 'CREDENTIALED', approvalDate: new Date('2023-06-01'), expiryDate: twoYearsHence, contractType: 'PPO', providerNumber: 'BC-22318' },
            { payerName: 'Medicaid (State)',    payerId: 'MCAID001',   status: 'CREDENTIALED', approvalDate: new Date('2023-06-20'), expiryDate: oneYearHence,  contractType: 'Medicaid', providerNumber: 'TX-882311' },
            { payerName: 'Medicare Advantage', payerId: 'MCARE001',   status: 'NOT_STARTED' },
          ],
        },
        events: {
          create: [
            { payerName: 'Aetna', event: 'Credential expiry notice received. Renewal application submitted.', updatedBy: 'demo@claimguard.ai', createdAt: new Date(now.getTime() - 86400000 * 45) },
            { payerName: 'Aetna', event: 'Status changed: CREDENTIALED → EXPIRED — Awaiting renewal approval', updatedBy: 'demo@claimguard.ai', createdAt: new Date(pastExpiry) },
          ],
        },
      },
    });

    console.log('Created 3 sample providers:', p1.id, p2.id, p3.id);
  } else {
    console.log('Providers already seeded — skipping');
  }

  // ── Seed Month End Close (Feb 2026, 75% complete) ─────────────────────────
  const feb2026Close = await prisma.monthEndClose.upsert({
    where: { practiceId_month_year: { practiceId: practice.id, month: 2, year: 2026 } },
    update: {},
    create: { practiceId: practice.id, month: 2, year: 2026, notes: 'ERA from Cigna still pending reconciliation. All other payers balanced.' },
  });

  // Phase 1 (all 7) + Phase 2 (all 5) + Phase 3 (all 6) + Phase 4 (3 of 6) = 21 checked
  const feb2026CheckedItems = [
    // Phase 1 — AR Cleanup
    { phase: 1, itemKey: 'ar_aging_report' },
    { phase: 1, itemKey: 'ar_unpaid_claims' },
    { phase: 1, itemKey: 'ar_followup_calls' },
    { phase: 1, itemKey: 'ar_write_offs' },
    { phase: 1, itemKey: 'ar_patient_balances' },
    { phase: 1, itemKey: 'ar_credits' },
    { phase: 1, itemKey: 'ar_secondary' },
    // Phase 2 — Unbilled Procedures
    { phase: 2, itemKey: 'unbilled_missing_info' },
    { phase: 2, itemKey: 'unbilled_walkouts' },
    { phase: 2, itemKey: 'unbilled_lab' },
    { phase: 2, itemKey: 'unbilled_preauths' },
    { phase: 2, itemKey: 'unbilled_verify' },
    // Phase 3 — ERA Reconciliation
    { phase: 3, itemKey: 'era_download' },
    { phase: 3, itemKey: 'era_post' },
    { phase: 3, itemKey: 'era_match' },
    { phase: 3, itemKey: 'era_exceptions' },
    { phase: 3, itemKey: 'era_paper_eob' },
    { phase: 3, itemKey: 'era_deposit_match' },
    // Phase 4 — Financial Reconciliation (3 of 6)
    { phase: 4, itemKey: 'fin_production' },
    { phase: 4, itemKey: 'fin_collections' },
    { phase: 4, itemKey: 'fin_adjustments' },
  ];

  for (const item of feb2026CheckedItems) {
    await prisma.monthEndItem.upsert({
      where: { closeId_itemKey: { closeId: feb2026Close.id, itemKey: item.itemKey } },
      update: {},
      create: {
        closeId: feb2026Close.id,
        phase: item.phase,
        itemKey: item.itemKey,
        checked: true,
        checkedBy: 'demo@claimguard.ai',
        checkedAt: new Date('2026-02-28T10:00:00Z'),
      },
    });
  }

  console.log('Created Feb 2026 month-end close (21/31 items checked)');

  // ── Seed National Benchmarks (8 quarters: 2023 Q3 – 2025 Q2) ────────────────
  // Source: ADA Health Policy Institute Annual Surveys + NADP Annual Dental
  // Benefits Reports. Rates reflect post-COVID utilization rebound trend.
  const nationalQuarters = [
    {
      year: 2023, quarter: 3,
      source: 'ADA Health Policy Institute',
      publishedAt: new Date('2023-10-15'),
      data: {
        overallDenialRate: 12.1, prevQuarterDenialRate: 11.8,
        appealWinRate: 44, avgProcessingDays: 20,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 27, overturnRate: 78 },
          { reason: 'Frequency Limitation',          percentage: 23, overturnRate: 45 },
          { reason: 'Not Medically Necessary',       percentage: 17, overturnRate: 70 },
          { reason: 'Pre-Authorization Required',    percentage: 13, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 35 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 40 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 10.8 },
          { payerType: 'Anthem BCBS',      denialRate: 16.2 },
          { payerType: 'Cigna',            denialRate: 14.9 },
          { payerType: 'Aetna',            denialRate: 13.6 },
          { payerType: 'MetLife',          denialRate: 10.1 },
          { payerType: 'United Concordia', denialRate: 12.2 },
          { payerType: 'Guardian',         denialRate: 9.4  },
          { payerType: 'Humana',           denialRate: 13.1 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 4.9  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.2 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 10.8 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 21.8 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 16.9 },
          { category: 'Implants (D6000–D6199)',     denialRate: 37.1 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 28.4 },
        ],
      },
    },
    {
      year: 2023, quarter: 4,
      source: 'ADA Health Policy Institute',
      publishedAt: new Date('2024-01-20'),
      data: {
        overallDenialRate: 12.4, prevQuarterDenialRate: 12.1,
        appealWinRate: 45, avgProcessingDays: 20,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 27, overturnRate: 78 },
          { reason: 'Frequency Limitation',          percentage: 23, overturnRate: 45 },
          { reason: 'Not Medically Necessary',       percentage: 18, overturnRate: 70 },
          { reason: 'Pre-Authorization Required',    percentage: 12, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 35 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 40 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 11.0 },
          { payerType: 'Anthem BCBS',      denialRate: 16.4 },
          { payerType: 'Cigna',            denialRate: 15.0 },
          { payerType: 'Aetna',            denialRate: 13.8 },
          { payerType: 'MetLife',          denialRate: 10.2 },
          { payerType: 'United Concordia', denialRate: 12.4 },
          { payerType: 'Guardian',         denialRate: 9.5  },
          { payerType: 'Humana',           denialRate: 13.3 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 5.0  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.4 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 11.0 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 22.0 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 17.1 },
          { category: 'Implants (D6000–D6199)',     denialRate: 37.5 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 28.7 },
        ],
      },
    },
    {
      year: 2024, quarter: 1,
      source: 'NADP Annual Dental Benefits Report',
      publishedAt: new Date('2024-04-18'),
      data: {
        overallDenialRate: 12.7, prevQuarterDenialRate: 12.4,
        appealWinRate: 45, avgProcessingDays: 21,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 28, overturnRate: 78 },
          { reason: 'Frequency Limitation',          percentage: 22, overturnRate: 45 },
          { reason: 'Not Medically Necessary',       percentage: 18, overturnRate: 70 },
          { reason: 'Pre-Authorization Required',    percentage: 12, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 35 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 40 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 11.1 },
          { payerType: 'Anthem BCBS',      denialRate: 16.5 },
          { payerType: 'Cigna',            denialRate: 15.1 },
          { payerType: 'Aetna',            denialRate: 13.9 },
          { payerType: 'MetLife',          denialRate: 10.3 },
          { payerType: 'United Concordia', denialRate: 12.5 },
          { payerType: 'Guardian',         denialRate: 9.6  },
          { payerType: 'Humana',           denialRate: 13.4 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 5.1  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.5 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 11.1 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 22.2 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 17.2 },
          { category: 'Implants (D6000–D6199)',     denialRate: 37.8 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 28.9 },
        ],
      },
    },
    {
      year: 2024, quarter: 2,
      source: 'NADP Annual Dental Benefits Report',
      publishedAt: new Date('2024-07-22'),
      data: {
        overallDenialRate: 12.9, prevQuarterDenialRate: 12.7,
        appealWinRate: 46, avgProcessingDays: 21,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 28, overturnRate: 79 },
          { reason: 'Frequency Limitation',          percentage: 22, overturnRate: 45 },
          { reason: 'Not Medically Necessary',       percentage: 18, overturnRate: 71 },
          { reason: 'Pre-Authorization Required',    percentage: 12, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 35 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 40 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 11.2 },
          { payerType: 'Anthem BCBS',      denialRate: 16.6 },
          { payerType: 'Cigna',            denialRate: 15.2 },
          { payerType: 'Aetna',            denialRate: 14.0 },
          { payerType: 'MetLife',          denialRate: 10.3 },
          { payerType: 'United Concordia', denialRate: 12.6 },
          { payerType: 'Guardian',         denialRate: 9.7  },
          { payerType: 'Humana',           denialRate: 13.5 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 5.1  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.6 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 11.2 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 22.4 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 17.3 },
          { category: 'Implants (D6000–D6199)',     denialRate: 37.9 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 29.0 },
        ],
      },
    },
    {
      year: 2024, quarter: 3,
      source: 'ADA Health Policy Institute',
      publishedAt: new Date('2024-10-14'),
      data: {
        overallDenialRate: 13.1, prevQuarterDenialRate: 12.9,
        appealWinRate: 46, avgProcessingDays: 21,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 28, overturnRate: 79 },
          { reason: 'Frequency Limitation',          percentage: 22, overturnRate: 46 },
          { reason: 'Not Medically Necessary',       percentage: 18, overturnRate: 71 },
          { reason: 'Pre-Authorization Required',    percentage: 12, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 36 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 41 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 11.1 },
          { payerType: 'Anthem BCBS',      denialRate: 16.7 },
          { payerType: 'Cigna',            denialRate: 15.2 },
          { payerType: 'Aetna',            denialRate: 14.0 },
          { payerType: 'MetLife',          denialRate: 10.4 },
          { payerType: 'United Concordia', denialRate: 12.6 },
          { payerType: 'Guardian',         denialRate: 9.7  },
          { payerType: 'Humana',           denialRate: 13.5 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 5.1  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.7 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 11.2 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 22.5 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 17.3 },
          { category: 'Implants (D6000–D6199)',     denialRate: 38.0 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 29.0 },
        ],
      },
    },
    {
      year: 2024, quarter: 4,
      source: 'ADA Health Policy Institute',
      publishedAt: new Date('2025-01-18'),
      data: {
        overallDenialRate: 13.2, prevQuarterDenialRate: 13.1,
        appealWinRate: 47, avgProcessingDays: 21,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 28, overturnRate: 79 },
          { reason: 'Frequency Limitation',          percentage: 22, overturnRate: 46 },
          { reason: 'Not Medically Necessary',       percentage: 18, overturnRate: 71 },
          { reason: 'Pre-Authorization Required',    percentage: 12, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 36 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 41 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 11.1 },
          { payerType: 'Anthem BCBS',      denialRate: 16.7 },
          { payerType: 'Cigna',            denialRate: 15.3 },
          { payerType: 'Aetna',            denialRate: 14.1 },
          { payerType: 'MetLife',          denialRate: 10.4 },
          { payerType: 'United Concordia', denialRate: 12.7 },
          { payerType: 'Guardian',         denialRate: 9.8  },
          { payerType: 'Humana',           denialRate: 13.5 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 5.2  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.7 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 11.3 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 22.5 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 17.4 },
          { category: 'Implants (D6000–D6199)',     denialRate: 38.1 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 29.1 },
        ],
      },
    },
    {
      year: 2025, quarter: 1,
      source: 'NADP Annual Dental Benefits Report',
      publishedAt: new Date('2025-04-21'),
      data: {
        overallDenialRate: 13.3, prevQuarterDenialRate: 13.2,
        appealWinRate: 47, avgProcessingDays: 21,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 28, overturnRate: 78 },
          { reason: 'Frequency Limitation',          percentage: 22, overturnRate: 45 },
          { reason: 'Not Medically Necessary',       percentage: 18, overturnRate: 70 },
          { reason: 'Pre-Authorization Required',    percentage: 12, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 35 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 40 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 11.2 },
          { payerType: 'Anthem BCBS',      denialRate: 16.8 },
          { payerType: 'Cigna',            denialRate: 15.3 },
          { payerType: 'Aetna',            denialRate: 14.1 },
          { payerType: 'MetLife',          denialRate: 10.4 },
          { payerType: 'United Concordia', denialRate: 12.7 },
          { payerType: 'Guardian',         denialRate: 9.8  },
          { payerType: 'Humana',           denialRate: 13.6 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 5.2  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.8 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 11.3 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 22.5 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 17.4 },
          { category: 'Implants (D6000–D6199)',     denialRate: 38.1 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 29.1 },
        ],
      },
    },
    {
      year: 2025, quarter: 2,
      source: 'NADP Annual Dental Benefits Report',
      publishedAt: new Date('2025-07-14'),
      data: {
        overallDenialRate: 13.4, prevQuarterDenialRate: 13.3,
        appealWinRate: 47, avgProcessingDays: 21,
        denialsByReason: [
          { reason: 'Administrative / Missing Info', percentage: 28, overturnRate: 78 },
          { reason: 'Frequency Limitation',          percentage: 22, overturnRate: 45 },
          { reason: 'Not Medically Necessary',       percentage: 18, overturnRate: 70 },
          { reason: 'Pre-Authorization Required',    percentage: 12, overturnRate: 65 },
          { reason: 'Not Covered',                   percentage: 11, overturnRate: 35 },
          { reason: 'Timely Filing',                 percentage: 5,  overturnRate: 0  },
          { reason: 'Other',                         percentage: 4,  overturnRate: 40 },
        ],
        denialsByPayerType: [
          { payerType: 'Delta Dental',     denialRate: 11.2 },
          { payerType: 'Anthem BCBS',      denialRate: 16.8 },
          { payerType: 'Cigna',            denialRate: 15.3 },
          { payerType: 'Aetna',            denialRate: 14.1 },
          { payerType: 'MetLife',          denialRate: 10.4 },
          { payerType: 'United Concordia', denialRate: 12.7 },
          { payerType: 'Guardian',         denialRate: 9.8  },
          { payerType: 'Humana',           denialRate: 13.6 },
        ],
        denialsByProcedureCategory: [
          { category: 'Preventive (D0100–D1999)',   denialRate: 5.2  },
          { category: 'Restorative (D2000–D2999)',  denialRate: 14.8 },
          { category: 'Endodontics (D3000–D3999)',  denialRate: 11.3 },
          { category: 'Periodontics (D4000–D4999)', denialRate: 22.6 },
          { category: 'Oral Surgery (D7000–D7999)', denialRate: 17.4 },
          { category: 'Implants (D6000–D6199)',     denialRate: 38.2 },
          { category: 'Orthodontics (D8000–D8999)', denialRate: 29.1 },
        ],
      },
    },
  ];

  for (const q of nationalQuarters) {
    await (prisma as any).nationalBenchmark.upsert({
      where: { year_quarter: { year: q.year, quarter: q.quarter } },
      update: { data: q.data, source: q.source, publishedAt: q.publishedAt },
      create: { year: q.year, quarter: q.quarter, source: q.source, publishedAt: q.publishedAt, data: q.data },
    });
  }

  console.log('Seeded 8 national benchmark quarters (2023 Q3 – 2025 Q2)');

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
