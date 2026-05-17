import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();

    // Two-step practice lookup — avoids OR + relation filter that trips DriverAdapterError
    let practice = await prisma.practice.findUnique({ where: { userId: session!.user.id } });
    if (!practice) {
      const user = await prisma.user.findUnique({
        where: { id: session!.user.id },
        select: { practiceId: true },
      });
      if (user?.practiceId) {
        practice = await prisma.practice.findUnique({ where: { id: user.practiceId } });
      }
    }

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

    // Fetch claims and active users in parallel — use findMany + JS aggregation to
    // avoid prisma.claim.aggregate() and prisma.user.count() which both cause
    // DriverAdapterError with @prisma/adapter-pg (count() maps to aggregate internally)
    const [claims, activeUserRows] = await Promise.all([
      prisma.claim.findMany({
        where: { practiceId: pid, deletedAt: null, ...serviceFilter },
        select: { id: true, status: true, totalAmount: true, submittedAt: true },
      }),
      prisma.user.findMany({
        where: { practiceId: pid, isActive: true },
        select: { id: true },
      }),
    ]);
    const activeUsers = activeUserRows.length;

    // Fetch appeals keyed by claimId (direct field, no relation filter)
    const claimIds = claims.map(c => c.id);
    const appeals = claimIds.length > 0
      ? await prisma.appeal.findMany({
          where: { claimId: { in: claimIds }, status: { in: ['WON', 'LOST'] } },
          select: { status: true, amountRecovered: true },
        })
      : [];

    // JS-side aggregation
    const totalClaims    = claims.length;
    const totalBilled    = claims.reduce((s, c) => s + c.totalAmount, 0);
    const approvedRevenue = claims
      .filter(c => c.status === 'APPROVED' || c.status === 'APPEAL_WON')
      .reduce((s, c) => s + c.totalAmount, 0);
    const deniedAmount   = claims
      .filter(c => c.status === 'DENIED' || c.status === 'APPEAL_LOST')
      .reduce((s, c) => s + c.totalAmount, 0);
    const pendingAmount  = claims
      .filter(c => c.status === 'PENDING' || c.status === 'SUBMITTED' || c.status === 'APPEALING')
      .reduce((s, c) => s + c.totalAmount, 0);
    const appealingCount = claims.filter(c => c.status === 'APPEALING').length;
    const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldUnpaidCount = claims.filter(
      c =>
        (c.status === 'PENDING' || c.status === 'SUBMITTED') &&
        c.submittedAt != null &&
        c.submittedAt <= thirtyDaysAgo,
    ).length;

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
      totalBilled,
      approvedRevenue,
      deniedAmount,
      pendingAmount,
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
