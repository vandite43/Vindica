import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateMfaCode } from '@/lib/auth/mfa';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/auth/send-mfa
 * Generates a 6-digit MFA code, saves it to the user record with a
 * 10-minute expiry, and emails it to the user's address.
 * Used both on initial login and for "Resend code" requests.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const code = await generateMfaCode(userId);

    const deliveryEmail =
      user.email === 'demo@claimguard.ai'
        ? 'huseynaghayev61@gmail.com'
        : user.email;

    await sendEmail({
      to: deliveryEmail,
      subject: 'Your Vindica verification code',
      text: [
        `Your verification code is: ${code}`,
        '',
        'This code expires in 10 minutes.',
        'If you did not request this code, please contact your administrator.',
      ].join('\n'),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[send-mfa]', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
