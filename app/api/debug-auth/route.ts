import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Temporary debug endpoint — remove after diagnosing auth issue
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ step: 'findUser', result: 'NOT_FOUND' });
    if (!user.password) return NextResponse.json({ step: 'password', result: 'NO_PASSWORD' });
    if (!user.isActive) return NextResponse.json({ step: 'isActive', result: 'INACTIVE' });

    const isValid = await bcrypt.compare(password, user.password);
    return NextResponse.json({
      step: 'bcrypt',
      isValid,
      mfaEnabled: user.mfaEnabled,
      role: user.role,
      id: user.id,
    });
  } catch (err: unknown) {
    return NextResponse.json({ step: 'error', message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
