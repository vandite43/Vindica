import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const { id } = await params;
    const credentials = await prisma.providerCredential.findMany({
      where: { providerId: id },
      orderBy: { payerName: 'asc' },
    });
    return NextResponse.json(credentials);
  } catch (err) {
    console.error('[providers/[id]/credentials GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const { id } = await params;
    const body = await req.json();
    const { payerName, payerId, status, applicationDate, approvalDate,
            expiryDate, contractType, providerNumber, notes } = body;

    const credential = await prisma.providerCredential.create({
      data: {
        providerId: id,
        payerName, payerId,
        status: status ?? 'NOT_STARTED',
        applicationDate: applicationDate ? new Date(applicationDate) : null,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        contractType: contractType || null,
        providerNumber: providerNumber || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (err) {
    console.error('[providers/[id]/credentials POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id: providerId } = await params;
    const body = await req.json();
    const { credentialId, status, applicationDate, approvalDate,
            expiryDate, contractType, providerNumber, notes, payerName } = body;

    const existing = await prisma.providerCredential.findUnique({ where: { id: credentialId } });
    if (!existing || existing.providerId !== providerId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.providerCredential.update({
      where: { id: credentialId },
      data: {
        ...(status !== undefined && { status }),
        ...(applicationDate !== undefined && { applicationDate: applicationDate ? new Date(applicationDate) : null }),
        ...(approvalDate !== undefined && { approvalDate: approvalDate ? new Date(approvalDate) : null }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(contractType !== undefined && { contractType: contractType || null }),
        ...(providerNumber !== undefined && { providerNumber: providerNumber || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    // Auto-log status change event
    if (status !== undefined && status !== existing.status) {
      await prisma.credentialingEvent.create({
        data: {
          providerId,
          payerName: payerName ?? existing.payerName,
          event: `Status changed: ${existing.status} → ${status}`,
          updatedBy: session!.user.email!,
        },
      });
    }

    await writeAuditLog({
      userId: session!.user.id,
      userEmail: session!.user.email!,
      action: 'UPDATE',
      resource: `credential:${credentialId}`,
      outcome: 'SUCCESS',
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[providers/[id]/credentials PUT]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
