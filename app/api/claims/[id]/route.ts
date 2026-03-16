import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { appeal: true, practice: { select: { userId: true } } },
    });

    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    if (claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json(claim);
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

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { practice: { select: { userId: true } } },
    });
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    if (claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.claim.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
