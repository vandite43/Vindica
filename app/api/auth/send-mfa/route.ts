import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateMfaCode } from '@/lib/auth/mfa';
import { sendMfaEmail } from '@/lib/notifications/email';
import { isRateLimited } from '@/lib/auth/rate-limit';

/**
 * POST /api/auth/send-mfa
 * Generates a 6-digit MFA code, saves it to the user record with a
 * 10-minute expiry, and emails it to the user's address.
 * Used both on initial login and for "Resend code" requests.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';

    // 5 MFA send requests per IP per 10 minutes
    if (isRateLimited(`send-mfa:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:       true,
        email:    true,
        practice: { select: { name: true } },
        memberOf: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const code = await generateMfaCode(userId);

    const overrideEmail = process.env.MFA_OVERRIDE_EMAIL;
    const deliveryEmail =
      overrideEmail && user.email === 'demo@claimguard.ai'
        ? overrideEmail
        : user.email;

    const practiceName = user.practice?.name ?? user.memberOf?.name ?? 'Vyndico';

    await sendMfaEmail({
      to:   deliveryEmail,
      code,
      practiceName,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[send-mfa]', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
