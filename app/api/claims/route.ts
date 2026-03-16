import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.practice.findUnique({ where: { userId: session.user.id } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const payerId = searchParams.get('payerId');

    const where: Record<string, unknown> = { practiceId: practice.id };
    if (status && status !== 'ALL') where.status = status;
    if (riskLevel && riskLevel !== 'ALL') where.riskLevel = riskLevel;
    if (payerId) where.payerId = payerId;

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { appeal: true },
      take: 100,
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.practice.findUnique({ where: { userId: session.user.id } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const body = await req.json();
    const claim = await prisma.claim.create({
      data: {
        practiceId: practice.id,
        patientName: body.patientName,
        patientDob: new Date(body.patientDob),
        patientInsuranceId: body.patientInsuranceId,
        payerId: body.payerId,
        payerName: body.payerName,
        planType: body.planType,
        claimDate: new Date(body.claimDate || new Date()),
        serviceDate: new Date(body.serviceDate),
        cdtCodes: body.cdtCodes,
        diagnosisCodes: body.diagnosisCodes || [],
        totalAmount: parseFloat(body.totalAmount),
        status: 'DRAFT',
      },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
