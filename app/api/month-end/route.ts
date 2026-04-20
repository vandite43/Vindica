import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
    });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const archive = searchParams.get('archive') === 'true';

    if (archive) {
      const closes = await prisma.monthEndClose.findMany({
        where: { practiceId: practice.id },
        include: { items: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
      return NextResponse.json(closes);
    }

    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));
    const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()));

    const close = await prisma.monthEndClose.upsert({
      where: { practiceId_month_year: { practiceId: practice.id, month, year } },
      update: {},
      create: { practiceId: practice.id, month, year },
      include: { items: true },
    });

    return NextResponse.json(close);
  } catch (error) {
    console.error('[month-end GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
