import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '8'), 20);

    const rows = await prisma.nationalBenchmark.findMany({
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      take: limit,
    });

    if (rows.length === 0) {
      return NextResponse.json({ latest: null, trend: [] });
    }

    const latest = rows[0];
    const trend = [...rows]
      .reverse()
      .map(r => ({
        label:      `${r.year} Q${r.quarter}`,
        denialRate: (r.data as { overallDenialRate: number }).overallDenialRate,
      }));

    return NextResponse.json({
      latest: {
        year:        latest.year,
        quarter:     latest.quarter,
        source:      latest.source,
        publishedAt: latest.publishedAt,
        data:        latest.data,
      },
      trend,
    });
  } catch (error) {
    console.error('[analytics/national GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN']);
    if (guard) return guard;

    const body = await req.json();
    const { year, quarter, source, publishedAt, data } = body;

    if (!year || !quarter || !source || !publishedAt || !data) {
      return NextResponse.json({ error: 'Missing required fields: year, quarter, source, publishedAt, data' }, { status: 400 });
    }
    if (quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'quarter must be 1–4' }, { status: 400 });
    }

    const record = await prisma.nationalBenchmark.upsert({
      where: { year_quarter: { year: parseInt(year), quarter: parseInt(quarter) } },
      update: { source, publishedAt: new Date(publishedAt), data },
      create: { year: parseInt(year), quarter: parseInt(quarter), source, publishedAt: new Date(publishedAt), data },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('[analytics/national POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
