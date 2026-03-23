import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

/**
 * POST /api/auth/credentials-check
 * Validates email + password without creating a NextAuth session.
 * Returns { userId, email, mfaEnabled } on success.
 * The caller is responsible for initiating MFA or calling signIn directly.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      await writeAuditLog({
        userEmail: email,
        action: 'LOGIN',
        resource: 'session:unknown',
        outcome: 'FAILURE',
        details: 'Credentials check: user not found',
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 },
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      await writeAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN',
        resource: `user:${user.id}`,
        outcome: 'FAILURE',
        details: 'Credentials check: invalid password',
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (error) {
    console.error('[credentials-check]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
