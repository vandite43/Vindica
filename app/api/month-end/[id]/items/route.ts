import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;
    const { itemKey, checked, phase } = await req.json();

    const close = await prisma.monthEndClose.findUnique({
      where: { id },
    });
    if (!close) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const item = await prisma.monthEndItem.upsert({
      where: { closeId_itemKey: { closeId: id, itemKey } },
      update: {
        checked,
        checkedBy: checked ? session!.user.email : null,
        checkedAt: checked ? new Date() : null,
      },
      create: {
        closeId: id,
        phase,
        itemKey,
        checked,
        checkedBy: checked ? session!.user.email : null,
        checkedAt: checked ? new Date() : null,
      },
    });

    await writeAuditLog({
      userId: session!.user.id,
      userEmail: session!.user.email!,
      action: 'MONTH_END_CHECKLIST_ITEM',
      resource: `month_end_item:${itemKey}`,
      outcome: 'SUCCESS',
      details: JSON.stringify({ closeId: id, month: close.month, year: close.year, checked }),
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('[month-end/items PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
