import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAppealLetter } from '@/lib/ai/appeal-generator';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const model: string | undefined = body.model;
    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: {
        claim: { include: { practice: { select: { userId: true } } } },
      },
    });

    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    if (appeal.claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const claim = appeal.claim;
    const payerIntelligence = await prisma.payer.findUnique({ where: { payerId: claim.payerId } });

    const letter = await generateAppealLetter(
      claim,
      claim.denialReason || 'Claim denied — see EOB for details',
      payerIntelligence
        ? {
            id: payerIntelligence.id,
            payerId: payerIntelligence.payerId,
            name: payerIntelligence.name,
            state: payerIntelligence.state,
            denialRate: payerIntelligence.denialRate,
            avgProcessDays: payerIntelligence.avgProcessDays,
            commonDenialReasons: payerIntelligence.commonDenialReasons,
            requiresPreAuth: payerIntelligence.requiresPreAuth,
            documentationQuirks: payerIntelligence.documentationQuirks,
          }
        : null,
      model
    );

    const updated = await prisma.appeal.update({
      where: { id },
      data: { letterContent: letter, generatedAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
