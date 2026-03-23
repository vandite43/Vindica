import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const { id } = await params;
    const { notes } = await req.json();
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
