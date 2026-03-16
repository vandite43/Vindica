import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const payers = await prisma.payer.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(payers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
