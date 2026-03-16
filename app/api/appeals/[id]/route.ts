import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: {
        claim: { include: { practice: { select: { userId: true } } } },
      },
    });

    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    if (appeal.claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json(appeal);
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

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: { claim: { include: { practice: { select: { userId: true } } } } },
    });
    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    if (appeal.claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.appeal.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
