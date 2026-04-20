import Header from '@/components/layout/Header';
import ClaimsTabs from '@/components/claims/ClaimsTabs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Claims — Vyndico' };

const KNOWN_PAYERS = [
  'Delta Dental', 'Cigna', 'Aetna', 'MetLife',
  'UnitedHealthcare', 'Guardian', 'Humana', 'BCBS', 'Medicaid',
] as const;

type Payer = typeof KNOWN_PAYERS[number] | 'Other';
type ARClaimStatus = 'Submitted' | 'Pending' | 'Denied';

function mapStatus(s: string): ARClaimStatus {
  if (s === 'SUBMITTED') return 'Submitted';
  if (s === 'DENIED') return 'Denied';
  return 'Pending';
}

async function getARQueueClaims(practiceId: string) {
  return prisma.claim.findMany({
    where: {
      practiceId,
      OR: [
        { status: { in: ['DRAFT', 'SUBMITTED', 'PENDING'] } },
        {
          status: 'DENIED',
          OR: [
            { appeal: null },
            { appeal: { status: 'DRAFT' } },
          ],
        },
      ],
    },
    include: { appeal: { select: { status: true } } },
    orderBy: { serviceDate: 'asc' },
  });
}

export default async function ClaimsPage() {
  const session = await auth();
  const isDemoUser = session?.user?.email === 'demo@Vyndico.ai';

  type ARClaim = {
    id: string;
    patientName: string;
    payer: Payer;
    cdtCode: string;
    procedureDescription: string;
    claimAmount: number;
    dateOfService: string;
    dateSubmitted: string;
    status: ARClaimStatus;
    notes: string;
    callLogs: never[];
  };

  let initialArClaims: ARClaim[] = [];

  if (session?.user?.id) {
    const practice = await prisma.practice.findUnique({
      where: { userId: session.user.id },
    });
    if (practice) {
      const dbClaims = await getARQueueClaims(practice.id);
      initialArClaims = dbClaims.map((c) => ({
        id: c.id,
        patientName: c.patientName,
        payer: (KNOWN_PAYERS as readonly string[]).includes(c.payerName)
          ? (c.payerName as Payer)
          : 'Other',
        cdtCode: c.cdtCodes[0] ?? '',
        procedureDescription: c.cdtCodes.join(', '),
        claimAmount: c.totalAmount,
        dateOfService: c.serviceDate.toISOString().split('T')[0],
        dateSubmitted: (c.submittedAt ?? c.createdAt).toISOString().split('T')[0],
        status: mapStatus(c.status),
        notes: c.denialReason ?? '',
        callLogs: [],
      }));
    }
  }

  return (
    <div>
      <Header
        title="Claims"
        subtitle="Manage and analyze claims, track AR, and log payer follow-ups"
      />
      <ClaimsTabs isDemoUser={isDemoUser} initialArClaims={initialArClaims} />
    </div>
  );
}
