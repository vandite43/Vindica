import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

const TOTAL_ITEMS = 31;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const { id } = await params;
    const checkedCount = await prisma.monthEndItem.count({
      where: { closeId: id, checked: true },
    });

    if (checkedCount < TOTAL_ITEMS) {
      return NextResponse.json(
        { error: `All ${TOTAL_ITEMS} items must be checked before closing` },
        { status: 400 },
      );
    }

    const close = await prisma.monthEndClose.update({
      where: { id },
      data: { closedAt: new Date() },
    });
    return NextResponse.json(close);
  } catch (error) {
    console.error('[month-end/close POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
