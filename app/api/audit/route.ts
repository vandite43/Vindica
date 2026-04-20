import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['ADMIN', 'SUPER_ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findFirst({
      where: {
        OR: [
          { userId: session!.user.id },
          { members: { some: { id: session!.user.id } } },
        ],
      },
      select: { id: true },
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const format    = searchParams.get('format') || 'json';
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const action    = searchParams.get('action')    || undefined;
    const userEmail = searchParams.get('userEmail')?.trim() || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate   = searchParams.get('endDate')   || undefined;

    const where: Record<string, unknown> = {
      practiceId: practice.id,
    };

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

    const select = {
      id:        true,
      timestamp: true,
      userEmail: true,
      action:    true,
      resource:  true,
      outcome:   true,
      ipAddress: true,
      details:   true,
    };

    if (format === 'csv') {
      const all = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        select,
      });

      const header = 'Timestamp,User,Action,Resource,Outcome,IP Address,Details';
      const rows = all.map(r =>
        [
          new Date(r.timestamp).toISOString(),
          `"${r.userEmail}"`,
          r.action,
          `"${r.resource}"`,
          r.outcome,
          r.ipAddress ?? '',
          `"${(r.details ?? '').replace(/"/g, '""')}"`,
        ].join(',')
      );

      return new NextResponse([header, ...rows].join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-log.csv"',
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
    console.error('[audit GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
