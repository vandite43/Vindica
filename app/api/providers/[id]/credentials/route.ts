import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true }).or(z.string().date()).nullable().optional();

const CredentialPostSchema = z.object({
  payerName:      z.string().min(1).max(200),
  payerId:        z.string().min(1).max(100),
  status:         z.enum(['NOT_STARTED', 'APPLICATION_SENT', 'IN_PROCESS', 'CREDENTIALED', 'EXPIRED', 'TERMINATED', 'DENIED']).optional(),
  applicationDate: isoDate,
  approvalDate:    isoDate,
  expiryDate:      isoDate,
  contractType:   z.string().max(100).nullable().optional(),
  providerNumber: z.string().max(100).nullable().optional(),
  notes:          z.string().max(2000).nullable().optional(),
});

const CredentialPutSchema = z.object({
  credentialId:    z.string().min(1),
  payerName:       z.string().max(200).optional(),
  status:          z.enum(['NOT_STARTED', 'APPLICATION_SENT', 'IN_PROCESS', 'CREDENTIALED', 'EXPIRED', 'TERMINATED', 'DENIED']).optional(),
  applicationDate: isoDate,
  approvalDate:    isoDate,
  expiryDate:      isoDate,
  contractType:    z.string().max(100).nullable().optional(),
  providerNumber:  z.string().max(100).nullable().optional(),
  notes:           z.string().max(2000).nullable().optional(),
});

async function getPracticeId(userId: string): Promise<string | null> {
  const practice = await prisma.practice.findFirst({
    where: { OR: [{ userId }, { members: { some: { id: userId } } }] },
    select: { id: true },
  });
  return practice?.id ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;

    const practiceId = await getPracticeId(session!.user.id);
    const provider = await prisma.provider.findUnique({ where: { id }, select: { practiceId: true } });
    if (!provider || provider.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

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
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;

    const practiceId = await getPracticeId(session!.user.id);
    const provider = await prisma.provider.findUnique({ where: { id }, select: { practiceId: true } });
    if (!provider || provider.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = CredentialPostSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { payerName, payerId, status, applicationDate, approvalDate,
            expiryDate, contractType, providerNumber, notes } = parsed.data;

    const credential = await prisma.providerCredential.create({
      data: {
        providerId: id,
        payerName,
        payerId,
        status: (status ?? 'NOT_STARTED') as import('@prisma/client').CredentialStatus,
        applicationDate: applicationDate ? new Date(applicationDate) : null,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        contractType: contractType || null,
        providerNumber: providerNumber || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A credential entry for this payer already exists' }, { status: 409 });
    }
    console.error('[providers/[id]/credentials POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id: providerId } = await params;

    const practiceId = await getPracticeId(session!.user.id);
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { practiceId: true } });
    if (!provider || provider.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsedPut = CredentialPutSchema.safeParse(rawBody);
    if (!parsedPut.success) {
      return NextResponse.json({ error: parsedPut.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { credentialId, status, applicationDate, approvalDate,
            expiryDate, contractType, providerNumber, notes, payerName } = parsedPut.data;

    const existing = await prisma.providerCredential.findUnique({ where: { id: credentialId } });
    if (!existing || existing.providerId !== providerId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.providerCredential.update({
      where: { id: credentialId },
      data: {
        ...(status !== undefined && { status: status as import('@prisma/client').CredentialStatus }),
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
