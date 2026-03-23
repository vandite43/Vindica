import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { CDT_CODES } from '@/lib/knowledge/cdt-codes';
import type { ClaimStatus } from '@prisma/client';

// ── CARC category definitions ─────────────────────────────────────────────────

const CARC_CATEGORIES = [
  { category: 'Administrative',    codes: ['CO-4','CO-11','CO-16','CO-18'], avgOverturnRate: '78%', priority: 'High'  as const },
  { category: 'Frequency',         codes: ['CO-151','N640'],                avgOverturnRate: '45%', priority: 'Low'   as const },
  { category: 'Bundling',          codes: ['CO-97'],                        avgOverturnRate: '55%', priority: 'High'  as const },
  { category: 'Medical Necessity', codes: ['CO-50'],                        avgOverturnRate: '70%', priority: 'High'  as const },
  { category: 'Timely Filing',     codes: ['CO-29'],                        avgOverturnRate: '0%',  priority: 'Fatal' as const },
  { category: 'Not Covered',       codes: ['CO-96','CO-119'],               avgOverturnRate: '35%', priority: 'Low'   as const },
  { category: 'COB Issues',        codes: ['CO-22'],                        avgOverturnRate: '60%', priority: 'High'  as const },
  { category: 'Authorization',     codes: ['OA-23'],                        avgOverturnRate: '65%', priority: 'High'  as const },
  { category: 'Other',             codes: [] as string[],                   avgOverturnRate: '40%', priority: 'Low'   as const },
];

function categorizeDenialCode(code: string | null): string {
  if (!code) return 'Other';
  const upper = code.toUpperCase().trim();
  for (const cat of CARC_CATEGORIES) {
    if (cat.codes.includes(upper)) return cat.category;
  }
  return 'Other';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function denialRateColor(rate: number): string {
  if (rate < 0.05) return 'green';
  if (rate < 0.10) return 'yellow';
  return 'red';
}

const DENIED_STATUSES: ClaimStatus[]    = ['DENIED', 'APPEAL_LOST'];
const SUBMITTED_STATUSES: ClaimStatus[] = ['SUBMITTED', 'APPROVED', 'DENIED', 'APPEALING', 'APPEAL_WON', 'APPEAL_LOST', 'CLOSED'];

// ── Sample data (returned when practice has no claims) ────────────────────────

function buildSampleData() {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return monthKey(d);
  });

  const denialTrend = months.map((month, i) => ({
    month,
    submitted: 42 + i * 3,
    denied: 5 + i,
    denialRate: parseFloat(((5 + i) / (42 + i * 3) * 100).toFixed(1)),
  }));

  const payerBreakdown = [
    { name: 'Delta Dental',   submitted: 48, denied: 9,  denialRate: 18.8, revenueAtRisk: 12340, previousDenialRate: 14.2 },
    { name: 'Anthem BCBS',    submitted: 35, denied: 7,  denialRate: 20.0, revenueAtRisk: 9870,  previousDenialRate: 17.5 },
    { name: 'Cigna',          submitted: 29, denied: 4,  denialRate: 13.8, revenueAtRisk: 4560,  previousDenialRate: 15.0 },
    { name: 'Aetna',          submitted: 22, denied: 2,  denialRate: 9.1,  revenueAtRisk: 2100,  previousDenialRate: 8.0  },
    { name: 'Guardian',       submitted: 18, denied: 1,  denialRate: 5.6,  revenueAtRisk: 890,   previousDenialRate: 6.2  },
  ];

  const cdtBreakdown = [
    { code: 'D4341', description: 'Periodontal scaling and root planing — four or more teeth per quadrant', submittedCount: 28, deniedCount: 9,  denialRate: 32.1, revenueAtRisk: 5670, topDenialCode: 'CO-16', topDenialReason: 'Missing periodontal charting' },
    { code: 'D6010', description: 'Surgical placement of implant body: endosteal implant',                   submittedCount: 14, deniedCount: 6,  denialRate: 42.9, revenueAtRisk: 8940, topDenialCode: 'OA-23', topDenialReason: 'Pre-authorization required' },
    { code: 'D2740', description: 'Crown — porcelain/ceramic substrate',                                     submittedCount: 31, deniedCount: 5,  denialRate: 16.1, revenueAtRisk: 7250, topDenialCode: 'CO-50', topDenialReason: 'Medical necessity not established' },
    { code: 'D7210', description: 'Extraction, erupted tooth requiring removal of bone',                     submittedCount: 19, deniedCount: 4,  denialRate: 21.1, revenueAtRisk: 2400, topDenialCode: 'CO-97', topDenialReason: 'Bundled with another procedure' },
    { code: 'D1110', description: 'Prophylaxis — adult',                                                    submittedCount: 44, deniedCount: 4,  denialRate: 9.1,  revenueAtRisk: 560,  topDenialCode: 'CO-151','topDenialReason': 'Frequency limitation exceeded' },
    { code: 'D0210', description: 'Intraoral — complete series of radiographic images',                      submittedCount: 22, deniedCount: 3,  denialRate: 13.6, revenueAtRisk: 990,  topDenialCode: 'CO-151', topDenialReason: 'Frequency limitation exceeded' },
    { code: 'D4342', description: 'Periodontal scaling and root planing — one to three teeth per quadrant',  submittedCount: 16, deniedCount: 3,  denialRate: 18.8, revenueAtRisk: 1350, topDenialCode: 'CO-16', topDenialReason: 'Missing documentation' },
    { code: 'D2750', description: 'Crown — porcelain fused to high noble metal',                             submittedCount: 20, deniedCount: 2,  denialRate: 10.0, revenueAtRisk: 2800, topDenialCode: 'CO-4',  topDenialReason: 'Procedure code inconsistent with modifier' },
    { code: 'D7140', description: 'Extraction, erupted tooth or exposed root',                               submittedCount: 25, deniedCount: 2,  denialRate: 8.0,  revenueAtRisk: 480,  topDenialCode: 'CO-18', topDenialReason: 'Duplicate claim' },
    { code: 'D0120', description: 'Periodic oral evaluation — established patient',                          submittedCount: 48, deniedCount: 2,  denialRate: 4.2,  revenueAtRisk: 160,  topDenialCode: 'CO-16', topDenialReason: 'Missing clinical notes' },
  ];

  const reasonBreakdown = [
    { category: 'Administrative',    carcCodes: ['CO-4','CO-11','CO-16','CO-18'], count: 11, percentage: 28.2, avgOverturnRate: '78%', priority: 'High'  as const },
    { category: 'Medical Necessity', carcCodes: ['CO-50'],                        count: 8,  percentage: 20.5, avgOverturnRate: '70%', priority: 'High'  as const },
    { category: 'Authorization',     carcCodes: ['OA-23'],                        count: 6,  percentage: 15.4, avgOverturnRate: '65%', priority: 'High'  as const },
    { category: 'Bundling',          carcCodes: ['CO-97'],                        count: 5,  percentage: 12.8, avgOverturnRate: '55%', priority: 'High'  as const },
    { category: 'Frequency',         carcCodes: ['CO-151','N640'],                count: 4,  percentage: 10.3, avgOverturnRate: '45%', priority: 'Low'   as const },
    { category: 'Not Covered',       carcCodes: ['CO-96','CO-119'],               count: 3,  percentage: 7.7,  avgOverturnRate: '35%', priority: 'Low'   as const },
    { category: 'Timely Filing',     carcCodes: ['CO-29'],                        count: 1,  percentage: 2.6,  avgOverturnRate: '0%',  priority: 'Fatal' as const },
    { category: 'Other',             carcCodes: [],                               count: 1,  percentage: 2.6,  avgOverturnRate: '40%', priority: 'Low'   as const },
  ];

  const providerBreakdown = [
    { providerName: 'Dr. Sarah Johnson (NPI: 1234567890)', submitted: 92, denied: 17, denialRate: 18.5, topDenialReason: 'Missing periodontal charting' },
    { providerName: 'Dr. Marcus Lee (NPI: 9876543210)',     submitted: 41, denied: 5,  denialRate: 12.2, topDenialReason: 'Pre-authorization required' },
    { providerName: 'Unknown Provider',                     submitted: 19, denied: 1,  denialRate: 5.3,  topDenialReason: 'Duplicate claim' },
  ];

  const alerts = [
    { type: 'red'    as const, message: 'Anthem BCBS denial rate is 20.0% this month — significantly above the 5% target. Review documentation requirements for this payer.' },
    { type: 'red'    as const, message: '1 claim was denied for timely filing this period representing $890 in permanent revenue loss. Review submission timeline process immediately.' },
    { type: 'yellow' as const, message: 'D6010 has a 42.9% denial rate this period. Review documentation requirements and consider updating your clinical narrative template.' },
    { type: 'yellow' as const, message: 'Only 38% of denied claims have been appealed this period. Industry best practice is to appeal all appropriate denials.' },
  ];

  return {
    isSampleData: true,
    overallDenialRate: 13.4,
    previousDenialRate: 11.2,
    revenueAtRisk: 29760,
    mostDeniedPayer: { name: 'Anthem BCBS', count: 7 },
    mostDeniedProcedure: { code: 'D4341', description: 'Periodontal scaling and root planing — four or more teeth per quadrant', count: 9 },
    denialTrend,
    payerBreakdown,
    cdtBreakdown,
    reasonBreakdown,
    providerBreakdown,
    alerts,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['ADMIN', 'OFFICE_MANAGER']);
    if (guard) return guard;

    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.practice.findUnique({ where: { userId: session.user.id } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    // Parse date range
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const startParam = searchParams.get('startDate');
    const endParam   = searchParams.get('endDate');

    const endDate   = endParam   ? new Date(endParam)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startDate = startParam ? new Date(startParam) : new Date(now.getFullYear(), now.getMonth(), 1);

    // Check if practice has any claims
    const claimCount = await prisma.claim.count({ where: { practiceId: practice.id } });
    if (claimCount === 0) {
      return NextResponse.json(buildSampleData());
    }

    // Compute previous period (same length, immediately before)
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd   = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodMs);

    // Fetch claims — only non-PHI fields needed
    const [currentClaims, previousClaims, allClaims] = await Promise.all([
      prisma.claim.findMany({
        where: {
          practiceId: practice.id,
          serviceDate: { gte: startDate, lte: endDate },
          status: { in: SUBMITTED_STATUSES },
        },
        select: {
          status: true, totalAmount: true, payerName: true, cdtCodes: true,
          denialCode: true, denialReason: true, serviceDate: true,
          providerNpi: true, appeal: { select: { id: true } },
        },
      }),
      prisma.claim.findMany({
        where: {
          practiceId: practice.id,
          serviceDate: { gte: prevStart, lte: prevEnd },
          status: { in: SUBMITTED_STATUSES },
        },
        select: { status: true, payerName: true, cdtCodes: true },
      }),
      // All claims for appeal rate calculation
      prisma.claim.findMany({
        where: {
          practiceId: practice.id,
          status: { in: SUBMITTED_STATUSES },
        },
        select: { status: true, appeal: { select: { id: true } } },
      }),
    ]);

    const deniedCurrent  = currentClaims.filter(c => DENIED_STATUSES.includes(c.status));
    const deniedPrevious = previousClaims.filter(c => DENIED_STATUSES.includes(c.status));

    // ── Section 1: Top metrics ───────────────────────────────────────────────
    const overallDenialRate = currentClaims.length
      ? parseFloat(((deniedCurrent.length / currentClaims.length) * 100).toFixed(1))
      : 0;
    const previousDenialRate = previousClaims.length
      ? parseFloat(((deniedPrevious.length / previousClaims.length) * 100).toFixed(1))
      : 0;
    const revenueAtRisk = deniedCurrent.reduce((sum, c) => sum + c.totalAmount, 0);

    // Most denied payer
    const payerDenials: Record<string, number> = {};
    for (const c of deniedCurrent) {
      payerDenials[c.payerName] = (payerDenials[c.payerName] ?? 0) + 1;
    }
    const mostDeniedPayerEntry = Object.entries(payerDenials).sort((a, b) => b[1] - a[1])[0];
    const mostDeniedPayer = mostDeniedPayerEntry
      ? { name: mostDeniedPayerEntry[0], count: mostDeniedPayerEntry[1] }
      : null;

    // Most denied procedure
    const codeDenials: Record<string, number> = {};
    for (const c of deniedCurrent) {
      for (const code of c.cdtCodes) {
        codeDenials[code] = (codeDenials[code] ?? 0) + 1;
      }
    }
    const mostDeniedCodeEntry = Object.entries(codeDenials).sort((a, b) => b[1] - a[1])[0];
    const mostDeniedProcedure = mostDeniedCodeEntry
      ? {
          code: mostDeniedCodeEntry[0],
          description: CDT_CODES[mostDeniedCodeEntry[0]]?.description ?? mostDeniedCodeEntry[0],
          count: mostDeniedCodeEntry[1],
        }
      : null;

    // ── Section 3: Denial trend ──────────────────────────────────────────────
    const trendMap: Record<string, { submitted: number; denied: number }> = {};
    for (const c of currentClaims) {
      const key = monthKey(new Date(c.serviceDate));
      if (!trendMap[key]) trendMap[key] = { submitted: 0, denied: 0 };
      trendMap[key].submitted++;
      if (DENIED_STATUSES.includes(c.status)) trendMap[key].denied++;
    }
    const denialTrend = Object.entries(trendMap).map(([month, v]) => ({
      month,
      submitted: v.submitted,
      denied: v.denied,
      denialRate: v.submitted ? parseFloat(((v.denied / v.submitted) * 100).toFixed(1)) : 0,
    }));

    // ── Section 4: Payer breakdown ───────────────────────────────────────────
    const payerMap: Record<string, { submitted: number; denied: number; revenue: number }> = {};
    for (const c of currentClaims) {
      if (!payerMap[c.payerName]) payerMap[c.payerName] = { submitted: 0, denied: 0, revenue: 0 };
      payerMap[c.payerName].submitted++;
      if (DENIED_STATUSES.includes(c.status)) {
        payerMap[c.payerName].denied++;
        payerMap[c.payerName].revenue += c.totalAmount;
      }
    }
    const prevPayerMap: Record<string, { submitted: number; denied: number }> = {};
    for (const c of previousClaims) {
      if (!prevPayerMap[c.payerName]) prevPayerMap[c.payerName] = { submitted: 0, denied: 0 };
      prevPayerMap[c.payerName].submitted++;
      if (DENIED_STATUSES.includes(c.status)) prevPayerMap[c.payerName].denied++;
    }
    const payerBreakdown = Object.entries(payerMap)
      .map(([name, v]) => {
        const prev = prevPayerMap[name];
        return {
          name,
          submitted: v.submitted,
          denied: v.denied,
          denialRate: v.submitted ? parseFloat(((v.denied / v.submitted) * 100).toFixed(1)) : 0,
          revenueAtRisk: v.revenue,
          previousDenialRate: prev && prev.submitted
            ? parseFloat(((prev.denied / prev.submitted) * 100).toFixed(1))
            : 0,
        };
      })
      .sort((a, b) => b.denied - a.denied);

    // ── Section 5: CDT breakdown ─────────────────────────────────────────────
    // Count submissions per CDT code
    const cdtSubmitted: Record<string, number> = {};
    const cdtDenied: Record<string, number> = {};
    const cdtRevenue: Record<string, number> = {};
    const cdtDenialCodes: Record<string, Record<string, number>> = {};
    const cdtDenialReasons: Record<string, Record<string, number>> = {};

    for (const c of currentClaims) {
      for (const code of c.cdtCodes) {
        cdtSubmitted[code] = (cdtSubmitted[code] ?? 0) + 1;
        if (DENIED_STATUSES.includes(c.status)) {
          cdtDenied[code] = (cdtDenied[code] ?? 0) + 1;
          cdtRevenue[code] = (cdtRevenue[code] ?? 0) + c.totalAmount;
          if (c.denialCode) {
            if (!cdtDenialCodes[code]) cdtDenialCodes[code] = {};
            cdtDenialCodes[code][c.denialCode] = (cdtDenialCodes[code][c.denialCode] ?? 0) + 1;
          }
          if (c.denialReason) {
            if (!cdtDenialReasons[code]) cdtDenialReasons[code] = {};
            cdtDenialReasons[code][c.denialReason] = (cdtDenialReasons[code][c.denialReason] ?? 0) + 1;
          }
        }
      }
    }

    const cdtBreakdown = Object.entries(cdtDenied)
      .map(([code, deniedCount]) => {
        const submitted = cdtSubmitted[code] ?? deniedCount;
        const topCode = Object.entries(cdtDenialCodes[code] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
        const topReason = Object.entries(cdtDenialReasons[code] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Not specified';
        return {
          code,
          description: CDT_CODES[code]?.description ?? code,
          submittedCount: submitted,
          deniedCount,
          denialRate: parseFloat(((deniedCount / submitted) * 100).toFixed(1)),
          revenueAtRisk: cdtRevenue[code] ?? 0,
          topDenialCode: topCode,
          topDenialReason: topReason,
        };
      })
      .sort((a, b) => b.deniedCount - a.deniedCount)
      .slice(0, 10);

    // ── Section 6: Reason breakdown ──────────────────────────────────────────
    const reasonMap: Record<string, number> = {};
    for (const c of deniedCurrent) {
      const cat = categorizeDenialCode(c.denialCode);
      reasonMap[cat] = (reasonMap[cat] ?? 0) + 1;
    }
    const totalDenied = deniedCurrent.length || 1;
    const reasonBreakdown = CARC_CATEGORIES
      .filter(cat => (reasonMap[cat.category] ?? 0) > 0 || cat.category === 'Other')
      .map(cat => ({
        category: cat.category,
        carcCodes: cat.codes,
        count: reasonMap[cat.category] ?? 0,
        percentage: parseFloat((((reasonMap[cat.category] ?? 0) / totalDenied) * 100).toFixed(1)),
        avgOverturnRate: cat.avgOverturnRate,
        priority: cat.priority,
      }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);

    // ── Section 7: Alerts ────────────────────────────────────────────────────
    const alerts: { type: 'red' | 'yellow'; message: string }[] = [];

    for (const p of payerBreakdown) {
      if (p.denialRate > 15) {
        alerts.push({
          type: 'red',
          message: `${p.name} denial rate is ${p.denialRate}% this period — significantly above the 5% target. Review documentation requirements for this payer.`,
        });
      }
    }

    const timelyClaims = deniedCurrent.filter(c => c.denialCode?.toUpperCase() === 'CO-29');
    if (timelyClaims.length > 0) {
      const amount = timelyClaims.reduce((s, c) => s + c.totalAmount, 0);
      alerts.push({
        type: 'red',
        message: `${timelyClaims.length} claim${timelyClaims.length > 1 ? 's were' : ' was'} denied for timely filing this period representing $${amount.toFixed(0)} in permanent revenue loss. Review submission timeline process immediately.`,
      });
    }

    for (const cdt of cdtBreakdown) {
      if (cdt.denialRate > 20 && cdt.deniedCount >= 5) {
        alerts.push({
          type: 'yellow',
          message: `${cdt.code} has a ${cdt.denialRate}% denial rate this period. Review documentation requirements and consider updating your clinical narrative template.`,
        });
      }
    }

    if (overallDenialRate > previousDenialRate && previousDenialRate > 0) {
      const diff = (overallDenialRate - previousDenialRate).toFixed(1);
      alerts.push({
        type: 'yellow',
        message: `Overall denial rate increased ${diff}% vs last period. Review recent payer policy changes.`,
      });
    }

    const totalDeniedAll = allClaims.filter(c => DENIED_STATUSES.includes(c.status));
    const withAppeals = totalDeniedAll.filter(c => c.appeal);
    const appealRate = totalDeniedAll.length
      ? Math.round((withAppeals.length / totalDeniedAll.length) * 100)
      : 100;
    if (appealRate < 50 && totalDeniedAll.length >= 3) {
      alerts.push({
        type: 'yellow',
        message: `Only ${appealRate}% of denied claims have been appealed. Industry best practice is to appeal all appropriate denials.`,
      });
    }

    // ── Section 8: Provider breakdown ────────────────────────────────────────
    const providerMap: Record<string, { submitted: number; denied: number; reasons: Record<string, number> }> = {};
    for (const c of currentClaims) {
      const key = c.providerNpi ?? 'Unknown Provider';
      if (!providerMap[key]) providerMap[key] = { submitted: 0, denied: 0, reasons: {} };
      providerMap[key].submitted++;
      if (DENIED_STATUSES.includes(c.status)) {
        providerMap[key].denied++;
        const reason = c.denialReason ?? 'Not specified';
        providerMap[key].reasons[reason] = (providerMap[key].reasons[reason] ?? 0) + 1;
      }
    }
    const providerBreakdown = Object.entries(providerMap)
      .map(([providerName, v]) => ({
        providerName,
        submitted: v.submitted,
        denied: v.denied,
        denialRate: v.submitted ? parseFloat(((v.denied / v.submitted) * 100).toFixed(1)) : 0,
        topDenialReason: Object.entries(v.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A',
      }))
      .sort((a, b) => b.denied - a.denied);

    return NextResponse.json({
      isSampleData: false,
      overallDenialRate,
      previousDenialRate,
      revenueAtRisk,
      mostDeniedPayer,
      mostDeniedProcedure,
      denialTrend,
      payerBreakdown,
      cdtBreakdown,
      reasonBreakdown,
      providerBreakdown,
      alerts,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
