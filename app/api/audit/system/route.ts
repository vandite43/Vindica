import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN']);
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const format     = searchParams.get('format')     || 'json';
    const page       = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const action     = searchParams.get('action')     || undefined;
    const userEmail  = searchParams.get('userEmail')?.trim() || undefined;
    const practiceId = searchParams.get('practiceId') || undefined;
    const startDate  = searchParams.get('startDate')  || undefined;
    const endDate    = searchParams.get('endDate')    || undefined;

    const where: Record<string, unknown> = {};

    if (userEmail) {
      where.userEmail = { contains: userEmail, mode: 'insensitive' };
    }
    if (action && action !== 'ALL') {
      where.action = action;
    }
    if (practiceId) {
      where.practiceId = practiceId;
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

    const select = {
      id:        true,
      timestamp: true,
      userEmail: true,
      action:    true,
      resource:  true,
      outcome:   true,
      ipAddress: true,
      userAgent: true,
      details:   true,
      practice:  { select: { id: true, name: true } },
    };

    if (format === 'csv') {
      const all = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        select,
      });

      const header = 'Timestamp,Practice,User,Action,Resource,Outcome,IP Address,User Agent,Details';
      const rows = all.map(r =>
        [
          new Date(r.timestamp).toISOString(),
          `"${r.practice?.name ?? 'System'}"`,
          `"${r.userEmail}"`,
          r.action,
          `"${r.resource}"`,
          r.outcome,
          r.ipAddress ?? '',
          `"${(r.userAgent ?? '').replace(/"/g, '""')}"`,
          `"${(r.details ?? '').replace(/"/g, '""')}"`,
        ].join(',')
      );

      return new NextResponse([header, ...rows].join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="system-audit-log.csv"',
        },
      });
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select,
      }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error('[audit/system GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
