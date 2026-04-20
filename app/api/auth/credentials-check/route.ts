import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { notifyFailedLogins } from '@/lib/notifications/send';
import { isRateLimited } from '@/lib/auth/rate-limit';

/**
 * POST /api/auth/credentials-check
 * Validates email + password without creating a NextAuth session.
 * Returns { userId, email, mfaEnabled } on success.
 * The caller is responsible for initiating MFA or calling signIn directly.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';

    // 10 attempts per IP per 15 minutes
    if (isRateLimited(`credentials:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

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
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip')
        ?? 'unknown';

      await writeAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN',
        resource: `user:${user.id}`,
        outcome: 'FAILURE',
        ipAddress: ip,
        details: 'Credentials check: invalid password',
      });

      // Check for 3+ failures within the last 10 minutes and alert practice admin
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentFailures = await prisma.auditLog.count({
        where: {
          userEmail: user.email,
          action: 'LOGIN',
          outcome: 'FAILURE',
          timestamp: { gte: tenMinutesAgo },
        },
      });

      if (recentFailures >= 3 && user.practiceId) {
        // Fire-and-forget — do not await so response isn't delayed
        notifyFailedLogins(user.practiceId, user.email, recentFailures, ip).catch(() => {});
      }

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
