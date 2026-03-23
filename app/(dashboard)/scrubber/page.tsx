import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import ScrubberClient from '@/components/scrubber/ScrubberClient';

export const dynamic = 'force-dynamic';

export default async function ScrubberPage({
  searchParams,
}: {
  searchParams: Promise<{ claimId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { claimId } = await searchParams;

  // If launched from a claim, fetch it and pre-populate checkboxes
  let initialChecked: string[] = [];
  let prefilled = false;
  let claimLabel: string | undefined;

  if (claimId) {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { practice: { select: { userId: true } } },
    });

    // Only pre-populate if this claim belongs to the logged-in user's practice
    if (claim && claim.practice.userId === session.user.id) {
      if (claim.xraysAttached)    initialChecked.push('radiographs');
      if (claim.perioCharting)    initialChecked.push('perio_chart');
      if (claim.narrativeIncluded) initialChecked.push('narrative');
      if (claim.preAuthObtained)  initialChecked.push('preauth');
      if (claim.providerNpi)      initialChecked.push('type1_npi');

      prefilled = initialChecked.length > 0;
      claimLabel = `${claim.patientName} — ${claim.payerName}`;
    }
  }

  return (
    <div>
      <Header title="Claim Scrubber" subtitle="Pre-submission checklist" />
      <ScrubberClient
        initialChecked={initialChecked}
        prefilled={prefilled}
        claimLabel={claimLabel}
      />
    </div>
  );
}
