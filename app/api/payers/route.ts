import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER', 'BILLER']);
    if (guard) return guard;

    const payers = await prisma.payer.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(payers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
