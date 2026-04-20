import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

const TOTAL_ITEMS = 31;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;

    // Ownership check
    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { id: true },
    });
    const close = await prisma.monthEndClose.findUnique({ where: { id }, select: { id: true, practiceId: true } });
    if (!close || !practice || close.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const checkedCount = await prisma.monthEndItem.count({
      where: { closeId: id, checked: true },
    });

    if (checkedCount < TOTAL_ITEMS) {
      return NextResponse.json(
        { error: `All ${TOTAL_ITEMS} items must be checked before closing` },
        { status: 400 },
      );
    }

    const updated = await prisma.monthEndClose.update({
      where: { id },
      data: { closedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[month-end/close POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
