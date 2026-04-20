import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';
import { createProvider, listProviders } from '@/lib/db/providers';

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findFirst({ where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const providers = await listProviders(practice.id);
    return NextResponse.json(providers);
  } catch (err) {
    console.error('[providers GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findFirst({ where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const body = await req.json();
    const { firstName, lastName, credentials, npiType1, licenseNumber, licenseState,
            licenseExpiry, deaNumber, specialty, startDate } = body;

    const provider = await createProvider(practice.id, {
      firstName, lastName, credentials, npiType1,
      licenseNumber, licenseState,
      licenseExpiry: new Date(licenseExpiry),
      deaNumber: deaNumber || null,
      specialty,
      startDate: new Date(startDate),
    });

    await writeAuditLog({
      userId: session!.user.id,
      userEmail: session!.user.email!,
      action: 'CREATE',
      resource: `provider:${provider.id}`,
      outcome: 'SUCCESS',
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (err) {
    console.error('[providers POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
