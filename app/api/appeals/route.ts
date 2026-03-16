import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { claimId } = body;

    // Verify the claim belongs to this user
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { practice: { select: { userId: true } } },
    });
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    if (claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Update claim status to APPEALING
    await prisma.claim.update({ where: { id: claimId }, data: { status: 'APPEALING' } });

    // Create or return existing appeal
    const existing = await prisma.appeal.findUnique({ where: { claimId } });
    if (existing) return NextResponse.json(existing);

    const appeal = await prisma.appeal.create({
      data: {
        claimId,
        letterContent: '',
        status: 'DRAFT',
      },
    });

    return NextResponse.json(appeal, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.practice.findUnique({ where: { userId: session.user.id } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const appeals = await prisma.appeal.findMany({
      where: { claim: { practiceId: practice.id } },
      include: {
        claim: {
          select: {
            id: true, patientName: true, payerName: true, cdtCodes: true,
            totalAmount: true, denialReason: true, serviceDate: true,
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });

    return NextResponse.json(appeals);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
