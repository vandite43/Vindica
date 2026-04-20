import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { getClaimById, updateClaim, deleteClaim } from '@/lib/db/claims';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const claim = await getClaimById(id);

    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session.user.id }, { members: { some: { id: session.user.id } } }] },
      select: { id: true },
    });
    if (!practice || claim.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(claim);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER', 'BILLER']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;

    const existing = await getClaimById(id);
    if (!existing) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    // Ownership check — supports both owner and member accounts
    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { id: true },
    });
    if (!practice || existing.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const updated = await updateClaim(id, {
      ...(body.patientName       !== undefined && { patientName:       body.patientName }),
      ...(body.patientDob        !== undefined && { patientDob:        new Date(body.patientDob) }),
      ...(body.patientInsuranceId !== undefined && { patientInsuranceId: body.patientInsuranceId }),
      ...(body.providerNpi       !== undefined && { providerNpi:       body.providerNpi }),
      ...(body.payerId           !== undefined && { payerId:           body.payerId }),
      ...(body.payerName         !== undefined && { payerName:         body.payerName }),
      ...(body.planType          !== undefined && { planType:          body.planType }),
      ...(body.claimDate         !== undefined && { claimDate:         new Date(body.claimDate) }),
      ...(body.serviceDate       !== undefined && { serviceDate:       new Date(body.serviceDate) }),
      ...(body.cdtCodes          !== undefined && { cdtCodes:          body.cdtCodes }),
      ...(body.toothNumbers      !== undefined && { toothNumbers:      body.toothNumbers }),
      ...(body.diagnosisCodes    !== undefined && { diagnosisCodes:    body.diagnosisCodes }),
      ...(body.totalAmount       !== undefined && { totalAmount:       body.totalAmount }),
      ...(body.preAuthNumber     !== undefined && { preAuthNumber:     body.preAuthNumber }),
      ...(body.xraysAttached     !== undefined && { xraysAttached:     body.xraysAttached }),
      ...(body.perioCharting     !== undefined && { perioCharting:     body.perioCharting }),
      ...(body.preAuthObtained   !== undefined && { preAuthObtained:   body.preAuthObtained }),
      ...(body.narrativeIncluded !== undefined && { narrativeIncluded: body.narrativeIncluded }),
      ...(body.status            !== undefined && { status:            body.status }),
      ...(body.submittedAt       !== undefined && { submittedAt:       new Date(body.submittedAt) }),
      ...(body.deniedAt          !== undefined && { deniedAt:          new Date(body.deniedAt) }),
      ...(body.denialReason      !== undefined && { denialReason:      body.denialReason }),
      ...(body.denialCode        !== undefined && { denialCode:        body.denialCode }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /claims error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;

    const claim = await getClaimById(id);
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    // Verify claim belongs to the user's practice
    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { id: true },
    });
    if (!practice || claim.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteClaim(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /claims error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
