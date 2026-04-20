import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';
import { getProviderById, updateProvider, deactivateProvider } from '@/lib/db/providers';

async function getPracticeId(userId: string) {
  const practice = await prisma.practice.findFirst({ where: { OR: [{ userId }, { members: { some: { id: userId } } }] } });
  return practice?.id ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practiceId = await getPracticeId(session!.user.id);
    const { id } = await params;

    const provider = await getProviderById(id);
    if (!provider || provider.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(provider);
  } catch (err) {
    console.error('[providers/[id] GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practiceId = await getPracticeId(session!.user.id);
    const { id } = await params;

    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing || existing.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { firstName, lastName, credentials, npiType1, licenseNumber, licenseState,
            licenseExpiry, deaNumber, specialty, startDate, active } = body;

    const updated = await updateProvider(id, {
      ...(firstName !== undefined     && { firstName }),
      ...(lastName !== undefined      && { lastName }),
      ...(credentials !== undefined   && { credentials }),
      ...(npiType1 !== undefined      && { npiType1 }),
      ...(licenseNumber !== undefined && { licenseNumber }),
      ...(licenseState !== undefined  && { licenseState }),
      ...(licenseExpiry !== undefined && { licenseExpiry: new Date(licenseExpiry) }),
      ...(deaNumber !== undefined     && { deaNumber: deaNumber || null }),
      ...(specialty !== undefined     && { specialty }),
      ...(startDate !== undefined     && { startDate: new Date(startDate) }),
      ...(active !== undefined        && { active }),
    });

    await writeAuditLog({
      userId: session!.user.id,
      userEmail: session!.user.email!,
      action: 'UPDATE',
      resource: `provider:${id}`,
      outcome: 'SUCCESS',
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[providers/[id] PUT]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practiceId = await getPracticeId(session!.user.id);
    const { id } = await params;

    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing || existing.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deactivateProvider(id);

    await writeAuditLog({
      userId: session!.user.id,
      userEmail: session!.user.email!,
      action: 'DELETE',
      resource: `provider:${id}`,
      outcome: 'SUCCESS',
      details: 'Soft-deactivated',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[providers/[id] DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
