import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const { id } = await params;
    const events = await prisma.credentialingEvent.findMany({
      where: { providerId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(events);
  } catch (err) {
    console.error('[providers/[id]/events GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;
    const body = await req.json();
    const { payerName, event, notes } = body;

    const created = await prisma.credentialingEvent.create({
      data: {
        providerId: id,
        payerName: payerName || null,
        event,
        updatedBy: session!.user.email!,
        notes: notes || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[providers/[id]/events POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
