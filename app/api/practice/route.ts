import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { id: true, name: true, npi: true, npiType2: true, taxId: true, address: true, billingAddress: true, state: true },
    });

    if (!practice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(practice);
  } catch (err) {
    console.error('[practice GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const body = await req.json();
    const { npiType2, taxId, billingAddress, name, npi, address, state } = body;

    const practice = await prisma.practice.findFirst({ where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] } });
    if (!practice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.practice.update({
      where: { id: practice.id },
      data: {
        ...(npiType2 !== undefined && { npiType2: npiType2 || null }),
        ...(taxId !== undefined && { taxId: taxId || null }),
        ...(billingAddress !== undefined && { billingAddress: billingAddress || null }),
        ...(name !== undefined && { name }),
        ...(npi !== undefined && { npi: npi || null }),
        ...(address !== undefined && { address: address || null }),
        ...(state !== undefined && { state: state || null }),
      },
      select: { id: true, name: true, npi: true, npiType2: true, taxId: true, address: true, billingAddress: true, state: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[practice PUT]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
