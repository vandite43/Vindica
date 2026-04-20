import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { notifyNewDeviceLogin } from '@/lib/notifications/send';
import { isRateLimited } from '@/lib/auth/rate-limit';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MFA_TOKEN_TTL_MS = 5 * 60 * 1000;  // 5 minutes for post-verify signIn

/**
 * POST /api/auth/verify-mfa
 * Validates the 6-digit code for a userId.
 * On success: clears MFA fields, issues a single-use mfaToken, returns it.
 * On failure: increments attempt counter; locks after 5 failures for 30 min.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';

    // 10 verify attempts per IP per 15 minutes
    if (isRateLimited(`verify-mfa:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { userId, code } = await req.json();

    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing userId or code' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Check account lock
    if (user.mfaLockedUntil && user.mfaLockedUntil > new Date()) {
      return NextResponse.json({ error: 'Account temporarily locked' }, { status: 423 });
    }

    const now = new Date();
    const codeExpired = !user.mfaCodeExpiry || user.mfaCodeExpiry < now;
    const codeMatches = user.mfaCode === code;

    if (!codeMatches || codeExpired) {
      const newAttempts = (user.mfaAttempts ?? 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaAttempts: newAttempts,
          ...(shouldLock && { mfaLockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }),
        },
      });

      await writeAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN',
        resource: `user:${user.id}`,
        outcome: 'FAILURE',
        details: shouldLock
          ? `MFA locked after ${MAX_ATTEMPTS} failed attempts`
          : `MFA invalid code (attempt ${newAttempts})`,
      });

      if (shouldLock) {
        return NextResponse.json({ error: 'Account temporarily locked' }, { status: 423 });
      }
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Success — issue a single-use mfaToken for the final signIn call
    const mfaToken = crypto.randomUUID();
    const mfaTokenExpiry = new Date(Date.now() + MFA_TOKEN_TTL_MS);

    const currentIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';

    const previousIp = user.lastKnownIp ?? null;
    const isNewDevice = previousIp !== null && currentIp !== 'unknown' && currentIp !== previousIp;

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaCode: null,
        mfaCodeExpiry: null,
        mfaAttempts: 0,
        mfaLockedUntil: null,
        mfaToken,
        mfaTokenExpiry,
        lastKnownIp: currentIp,
      },
    });

    // Alert admin if this is a new IP (fire-and-forget)
    if (isNewDevice && user.practiceId) {
      notifyNewDeviceLogin(user.practiceId, user.id, user.email, currentIp, previousIp).catch(() => {});
    }

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN',
      resource: `user:${user.id}`,
      outcome: 'SUCCESS',
      details: 'MFA code verified',
    });

    return NextResponse.json({ ok: true, mfaToken, email: user.email });
  } catch (error) {
    console.error('[verify-mfa]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
