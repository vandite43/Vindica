import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAppealLetter } from '@/lib/ai/appeal-generator';
import { getAppeal, saveAppealLetter } from '@/lib/db/appeals';
import { writeAuditLog } from '@/lib/audit';
import { getGlobalAIModel } from '@/lib/system-config';
import { isRateLimited } from '@/lib/auth/rate-limit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 5 appeal generations per user per minute
    // TODO: replace with Redis-backed limiter before multi-instance deployment
    if (isRateLimited(`generate:${session.user.id}`, 5, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Please wait before generating another appeal.' }, { status: 429 });
    }

    const { id } = await params;
    await req.json().catch(() => ({})); // body not used
    const model = await getGlobalAIModel();

    const appeal = await getAppeal(id);
    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });

    // Ownership check: allow owner OR practice member
    const userPractice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session.user.id }, { members: { some: { id: session.user.id } } }] },
      select: { id: true },
    });
    if (!userPractice || appeal.claim.practiceId !== userPractice.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const claim = appeal.claim;
    const payerIntelligence = await prisma.payer.findUnique({ where: { payerId: claim.payerId } });

    const letter = await generateAppealLetter(
      claim,
      claim.denialReason || 'Claim denied — see EOB for details',
      payerIntelligence
        ? {
            id:                  payerIntelligence.id,
            payerId:             payerIntelligence.payerId,
            name:                payerIntelligence.name,
            state:               payerIntelligence.state,
            denialRate:          payerIntelligence.denialRate,
            avgProcessDays:      payerIntelligence.avgProcessDays,
            commonDenialReasons: payerIntelligence.commonDenialReasons,
            requiresPreAuth:     payerIntelligence.requiresPreAuth,
            documentationQuirks: payerIntelligence.documentationQuirks,
          }
        : null,
      model
    );

    const updated = await saveAppealLetter(id, letter);

    await writeAuditLog({
      userId: session!.user.id,
      userEmail: session!.user.email!,
      action: 'CREATE',
      resource: `appeal:${id}`,
      outcome: 'SUCCESS',
      details: 'Appeal letter generated (PHI not transmitted to AI)',
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
