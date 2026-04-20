import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const ItemSchema = z.object({
  itemKey: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_\-]+$/, 'Invalid itemKey format'),
  checked: z.boolean(),
  phase:   z.number().int().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = ItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { itemKey, checked, phase } = parsed.data;

    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { id: true },
    });
    const close = await prisma.monthEndClose.findUnique({ where: { id } });
    if (!close || !practice || close.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const item = await prisma.monthEndItem.upsert({
      where: { closeId_itemKey: { closeId: id, itemKey } },
      update: {
        checked,
        checkedBy: checked ? session!.user.email : null,
        checkedAt: checked ? new Date() : null,
      },
      create: {
        closeId: id,
        phase: phase ?? 0,
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
