import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';

const DEFAULT_PAYERS = [
  { payerName: 'Delta Dental',       payerId: 'DELTA001' },
  { payerName: 'Cigna',              payerId: 'CIGNA001' },
  { payerName: 'Aetna',              payerId: 'AETNA001' },
  { payerName: 'MetLife',            payerId: 'METLIFE001' },
  { payerName: 'UnitedHealthcare',   payerId: 'UHC001' },
  { payerName: 'Guardian',           payerId: 'GUARD001' },
  { payerName: 'Humana',             payerId: 'HUMANA001' },
  { payerName: 'BCBS',               payerId: 'BCBS001' },
  { payerName: 'Medicaid (State)',    payerId: 'MCAID001' },
  { payerName: 'Medicare Advantage', payerId: 'MCARE001' },
];

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findUnique({ where: { userId: session!.user.id } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const providers = await prisma.provider.findMany({
      where: { practiceId: practice.id },
      include: { credentialing: true, events: { orderBy: { createdAt: 'desc' } } },
      orderBy: { lastName: 'asc' },
    });

    return NextResponse.json(providers);
  } catch (err) {
    console.error('[providers GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findUnique({ where: { userId: session!.user.id } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const body = await req.json();
    const { firstName, lastName, credentials, npiType1, licenseNumber, licenseState,
            licenseExpiry, deaNumber, specialty, startDate } = body;

    const provider = await prisma.provider.create({
      data: {
        practiceId: practice.id,
        firstName, lastName, credentials, npiType1,
        licenseNumber, licenseState,
        licenseExpiry: new Date(licenseExpiry),
        deaNumber: deaNumber || null,
        specialty,
        startDate: new Date(startDate),
        credentialing: {
          create: DEFAULT_PAYERS.map(p => ({ ...p, status: 'NOT_STARTED' as const })),
        },
      },
      include: { credentialing: true, events: true },
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
