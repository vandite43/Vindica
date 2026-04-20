import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

async function getPracticeId(userId: string) {
  const practice = await prisma.practice.findFirst({
    where: { OR: [{ userId }, { members: { some: { id: userId } } }] },
  });
  return practice?.id ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practiceId = await getPracticeId(session!.user.id);
    const { id } = await params;

    // Verify the provider belongs to the requesting user's practice
    const provider = await prisma.provider.findUnique({ where: { id }, select: { practiceId: true } });
    if (!provider || provider.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

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
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practiceId = await getPracticeId(session!.user.id);
    const { id } = await params;

    // Verify the provider belongs to the requesting user's practice
    const provider = await prisma.provider.findUnique({ where: { id }, select: { practiceId: true } });
    if (!provider || provider.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { payerName, event, notes } = body;

    if (!event || typeof event !== 'string' || event.trim().length === 0) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 });
    }

    const created = await prisma.credentialingEvent.create({
      data: {
        providerId: id,
        payerName: payerName || null,
        event: event.trim(),
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
