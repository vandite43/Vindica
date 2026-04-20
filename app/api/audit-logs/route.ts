import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN']);
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('userEmail')?.trim() || undefined;
    const action    = searchParams.get('action')    || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate   = searchParams.get('endDate')   || undefined;

    const where: Record<string, unknown> = {};

    if (userEmail) {
      where.userEmail = { contains: userEmail, mode: 'insensitive' };
    }
    if (action && action !== 'ALL') {
      where.action = action;
    }
    if (startDate || endDate) {
      const timestamp: Record<string, Date> = {};
      if (startDate) timestamp.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        timestamp.lte = end;
      }
      where.timestamp = timestamp;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
      select: {
        id:        true,
        timestamp: true,
        userEmail: true,
        action:    true,
        resource:  true,
        outcome:   true,
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('[audit-logs GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
