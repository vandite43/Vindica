import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { appeal: true, practice: { select: { userId: true } } },
    });

    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    if (claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json(claim);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { practice: { select: { userId: true } } },
    });
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    if (claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const {
      patientName, patientDob, patientInsuranceId,
      payerId, payerName, planType,
      claimDate, serviceDate, cdtCodes, diagnosisCodes, totalAmount,
      status, submittedAt, deniedAt, denialReason, denialCode,
    } = body;

    const updated = await prisma.claim.update({
      where: { id },
      data: {
        ...(patientName !== undefined && { patientName }),
        ...(patientDob !== undefined && { patientDob: new Date(patientDob) }),
        ...(patientInsuranceId !== undefined && { patientInsuranceId }),
        ...(payerId !== undefined && { payerId }),
        ...(payerName !== undefined && { payerName }),
        ...(planType !== undefined && { planType }),
        ...(claimDate !== undefined && { claimDate: new Date(claimDate) }),
        ...(serviceDate !== undefined && { serviceDate: new Date(serviceDate) }),
        ...(cdtCodes !== undefined && { cdtCodes }),
        ...(diagnosisCodes !== undefined && { diagnosisCodes }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(status !== undefined && { status }),
        ...(submittedAt !== undefined && { submittedAt: new Date(submittedAt) }),
        ...(deniedAt !== undefined && { deniedAt: new Date(deniedAt) }),
        ...(denialReason !== undefined && { denialReason }),
        ...(denialCode !== undefined && { denialCode }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
