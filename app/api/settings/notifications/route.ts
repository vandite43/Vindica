import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

/** GET /api/settings/notifications — returns current prefs for the practice */
export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { notificationPrefs: true },
    });

    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    return NextResponse.json({ prefs: practice.notificationPrefs ?? {} });
  } catch (err) {
    console.error('[settings/notifications GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/settings/notifications — merges provided keys into existing prefs */
export async function PATCH(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const body = await req.json();

    const practice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] },
      select: { id: true, notificationPrefs: true },
    });

    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const current = (practice.notificationPrefs as Record<string, boolean>) ?? {};
    const merged  = { ...current, ...body };

    await prisma.practice.update({
      where: { id: practice.id },
      data:  { notificationPrefs: merged },
    });

    return NextResponse.json({ prefs: merged });
  } catch (err) {
    console.error('[settings/notifications PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
