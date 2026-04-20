import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { z } from 'zod';

const NotesSchema = z.object({
  notes: z.string().max(5000),
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

    // Ownership check
    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { id: true },
    });
    const existing = await prisma.monthEndClose.findUnique({ where: { id }, select: { id: true, practiceId: true } });
    if (!existing || !practice || existing.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = NotesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { notes } = parsed.data;
    const close = await prisma.monthEndClose.update({
      where: { id },
      data: { notes },
    });
    return NextResponse.json(close);
  } catch (error) {
    console.error('[month-end/notes PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
