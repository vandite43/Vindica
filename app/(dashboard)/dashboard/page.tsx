import Header from '@/components/layout/Header';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

async function getDashboardData(userId: string) {
  const practice = await prisma.practice.findUnique({ where: { userId } });
  if (!practice) return null;

  const [claims, appeals] = await Promise.all([
    prisma.claim.findMany({
      where: { practiceId: practice.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.appeal.findMany({
      where: { claim: { practiceId: practice.id } },
    }),
  ]);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const claimsThisMonth = claims.filter(c => new Date(c.createdAt) >= thisMonth);
  const deniedClaims = claims.filter(c => c.status === 'DENIED' || c.status === 'APPEAL_LOST');
  const denialRate = claims.length > 0 ? (deniedClaims.length / claims.length) * 100 : 0;
  const revenueAtRisk = deniedClaims.reduce((sum, c) => sum + c.totalAmount, 0);
  const recoveredAppeals = appeals.filter(a => a.status === 'WON');
  const recoveredRevenue = recoveredAppeals.reduce((sum, a) => sum + (a.amountRecovered || 0), 0);

  // Monthly denial trend (last 6 months)
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const month = new Date();
    month.setMonth(month.getMonth() - i);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthClaims = claims.filter(c => {
      const d = new Date(c.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
    const monthDenied = monthClaims.filter(
      c => c.status === 'DENIED' || c.status === 'APPEAL_LOST'
    );

    trendData.push({
      month: month.toLocaleString('default', { month: 'short' }),
      denialRate: monthClaims.length > 0
        ? parseFloat(((monthDenied.length / monthClaims.length) * 100).toFixed(1))
        : 0,
      total: monthClaims.length,
    });
  }

  // Payer breakdown
  const payerMap: Record<string, { name: string; total: number; denied: number }> = {};
  for (const claim of claims) {
    if (!payerMap[claim.payerName]) {
      payerMap[claim.payerName] = { name: claim.payerName, total: 0, denied: 0 };
    }
    payerMap[claim.payerName].total++;
    if (claim.status === 'DENIED' || claim.status === 'APPEAL_LOST') {
      payerMap[claim.payerName].denied++;
    }
  }
  const payerData = Object.values(payerMap)
    .map(p => ({
      ...p,
      denialRate: p.total > 0 ? parseFloat(((p.denied / p.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    kpis: {
      claimsThisMonth: claimsThisMonth.length,
      denialRate: denialRate.toFixed(1),
      revenueAtRisk,
      recoveredRevenue,
    },
    trendData,
    payerData,
    recentClaims: claims.slice(0, 10).map(c => ({
      id: c.id,
      patientName: c.patientName,
      payerName: c.payerName,
      status: c.status,
      totalAmount: c.totalAmount,
      denialRiskScore: c.denialRiskScore,
      riskLevel: c.riskLevel,
      serviceDate: c.serviceDate.toISOString(),
    })),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const data = await getDashboardData(session.user.id);
  if (!data) redirect('/login');

  return (
    <div>
      <Header title="Dashboard" subtitle="Practice overview" />
      <DashboardClient data={data} />
    </div>
  );
}
