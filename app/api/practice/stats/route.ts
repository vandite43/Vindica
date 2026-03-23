import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    const practice = await prisma.practice.findUnique({
      where: { userId: session!.user.id },
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const pid = practice.id;

    // Optional month/year filter
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');
    const yearParam  = searchParams.get('year');
    let dateFilter: { gte: Date; lte: Date } | undefined;
    if (monthParam && yearParam) {
      const m = parseInt(monthParam);
      const y = parseInt(yearParam);
      const start = new Date(y, m - 1, 1);
      const end   = new Date(y, m, 0, 23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }
    const serviceFilter = dateFilter ? { serviceDate: dateFilter } : {};

    // Claim counts and sums in parallel
    const [
      totalClaims,
      allAmounts,
      approvedAmounts,
      deniedAmounts,
      pendingAmounts,
      appeals,
      activeUsers,
      appealingCount,
      oldUnpaidCount,
    ] = await Promise.all([
      prisma.claim.count({ where: { practiceId: pid, ...serviceFilter } }),

      prisma.claim.aggregate({
        where: { practiceId: pid, ...serviceFilter },
        _sum: { totalAmount: true },
      }),

      prisma.claim.aggregate({
        where: { practiceId: pid, status: { in: ['APPROVED', 'APPEAL_WON'] }, ...serviceFilter },
        _sum: { totalAmount: true },
      }),

      prisma.claim.aggregate({
        where: { practiceId: pid, status: { in: ['DENIED', 'APPEAL_LOST'] }, ...serviceFilter },
        _sum: { totalAmount: true },
      }),

      prisma.claim.aggregate({
        where: { practiceId: pid, status: { in: ['PENDING', 'SUBMITTED', 'APPEALING'] }, ...serviceFilter },
        _sum: { totalAmount: true },
      }),

      prisma.appeal.findMany({
        where: { claim: { practiceId: pid, ...serviceFilter }, status: { in: ['WON', 'LOST'] } },
        select: { status: true, amountRecovered: true },
      }),

      prisma.user.count({ where: { practiceId: pid, isActive: true } }),

      prisma.claim.count({
        where: { practiceId: pid, status: 'APPEALING', ...serviceFilter },
      }),

      prisma.claim.count({
        where: {
          practiceId: pid,
          status: { in: ['PENDING', 'SUBMITTED'] },
          submittedAt: { lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ...serviceFilter,
        },
      }),
    ]);

    const wonAppeals  = appeals.filter(a => a.status === 'WON');
    const lostAppeals = appeals.filter(a => a.status === 'LOST');
    const appealWinRate = appeals.length > 0
      ? Math.round((wonAppeals.length / appeals.length) * 100)
      : null;
    const recoveredRevenue = wonAppeals.reduce(
      (sum, a) => sum + (a.amountRecovered ?? 0),
      0,
    );

    return NextResponse.json({
      practice: {
        name:    practice.name,
        npi:     practice.npi,
        address: practice.address,
        state:   practice.state,
      },
      totalClaims,
      totalBilled:       allAmounts._sum.totalAmount     ?? 0,
      approvedRevenue:   approvedAmounts._sum.totalAmount ?? 0,
      deniedAmount:      deniedAmounts._sum.totalAmount   ?? 0,
      pendingAmount:     pendingAmounts._sum.totalAmount  ?? 0,
      recoveredRevenue,
      appealWinRate,
      totalAppeals:   appeals.length,
      wonAppeals:     wonAppeals.length,
      lostAppeals:    lostAppeals.length,
      activeUsers,
      appealingCount,
      oldUnpaidCount,
    });
  } catch (error) {
    console.error('[practice/stats GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
