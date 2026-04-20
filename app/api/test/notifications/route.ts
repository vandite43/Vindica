/**
 * POST /api/test/notifications
 *
 * Sends one test email of every notification type to the demo account email.
 * Development/admin use only — protected by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, APP_URL } from '@/lib/notifications/email';

const DEMO_EMAIL    = process.env.DEMO_EMAIL ?? '';
const PRACTICE_NAME = 'Sunshine Family Dentistry (Demo)';
const FAKE_CLAIM_ID = 'demo-claim-001';

type Result = { type: string; ok: boolean; error?: string };

async function send(
  type: string,
  subject: string,
  body: string,
  ctaLabel?: string,
  ctaUrl?: string,
): Promise<Result> {
  try {
    // sendEmail swallows errors internally, so we call Resend directly here
    // so we can capture success/failure per email.
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Use sendEmail but capture the error by wrapping the Resend call ourselves
    const FROM = process.env.RESEND_FROM_EMAIL ?? 'alerts@Vyndico.ai';

    const timestamp = new Date();
    const formattedTime = timestamp.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/New_York',
    });

    const bodyHtml = body
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p style="margin:0 0 12px 0;color:#374151;font-size:15px;line-height:1.6;">${l}</p>`)
      .join('\n');

    const ctaBlock = ctaLabel && ctaUrl
      ? `<div style="text-align:center;margin:32px 0;">
          <a href="${ctaUrl}" style="display:inline-block;background:#5B3FD4;color:#ffffff;
            font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:600;
            text-decoration:none;padding:12px 28px;border-radius:8px;">${ctaLabel}</a>
        </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F0EEFF;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEFF;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#5B3FD4;border-radius:12px 12px 0 0;padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;">
              Vyndi<span style="color:#C4B5FD;">co</span></span></td>
            <td align="right"><span style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.15em;text-transform:uppercase;">
              TEST — ${type}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;box-shadow:0 4px 24px rgba(91,63,212,0.08);">
          <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:6px;padding:10px 16px;margin-bottom:20px;font-size:13px;color:#92400E;">
            ⚠️ This is a <strong>test email</strong> — no real event occurred.
          </div>
          <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1A1033;">${subject}</h1>
          <p style="margin:0 0 28px 0;font-size:13px;color:#8B72E8;">${PRACTICE_NAME} · ${formattedTime} ET</p>
          <hr style="border:none;border-top:1px solid #E8E6F0;margin:0 0 24px 0;">
          ${bodyHtml}
          ${ctaBlock}
          <hr style="border:none;border-top:1px solid #E8E6F0;margin:24px 0 20px 0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
            This is an automated security notification from Vyndico sent to the practice administrator.<br><br>
            © ${new Date().getFullYear()} Vyndico · Intelligent Claims Recovery
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM,
      to: DEMO_EMAIL,
      subject: `[Vyndico TEST] ${subject}`,
      html,
    });

    if (error) return { type, ok: false, error: String(error.message ?? error) };
    return { type, ok: true };
  } catch (err) {
    return { type, ok: false, error: String(err) };
  }
}

export async function POST(req: NextRequest) {
  // Guard with CRON_SECRET so this can't be triggered by random visitors
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!DEMO_EMAIL) {
    return NextResponse.json({ error: 'DEMO_EMAIL environment variable is not set' }, { status: 500 });
  }

  const base = APP_URL;
  const results: Result[] = [];

  // 1. FAILED_LOGIN
  results.push(await send(
    'FAILED_LOGIN',
    'Failed login alert',
    [
      '3 consecutive failed login attempts have been detected for the account:',
      'Account: staff@sunshine-dental.com',
      'IP address: 203.0.113.47',
      'This may indicate a brute-force attempt. If you do not recognise this activity, consider resetting the password for this account immediately.',
    ].join('\n'),
    'Review Users', `${base}/settings`,
  ));

  // 2. NEW_DEVICE_LOGIN
  results.push(await send(
    'NEW_DEVICE_LOGIN',
    'Login from new location',
    [
      'A successful login was detected from an IP address not previously seen for this account.',
      'Account: biller@sunshine-dental.com',
      'New IP: 198.51.100.23',
      'Previous IP: 192.168.1.10',
      'If this login was expected, no action is needed. If it was not, please investigate immediately.',
    ].join('\n'),
    'View Audit Log', `${base}/settings`,
  ));

  // 3. NEW_USER_ADDED
  results.push(await send(
    'NEW_USER_ADDED',
    'New team member added',
    [
      'A new user account has been created in your Vyndico practice.',
      'Email: newstaff@sunshine-dental.com',
      'Role: BILLER',
      'Added by: admin@sunshine-dental.com',
      'If you did not authorise this, please review your team immediately.',
    ].join('\n'),
    'Manage Users', `${base}/settings`,
  ));

  // 4. ROLE_CHANGED
  results.push(await send(
    'ROLE_CHANGED',
    'User role changed',
    [
      "A user's role has been changed in your Vyndico practice.",
      'Account: biller@sunshine-dental.com',
      'Previous role: BILLER',
      'New role: OFFICE_MANAGER',
      'Changed by: admin@sunshine-dental.com',
    ].join('\n'),
    'Manage Users', `${base}/settings`,
  ));

  // 5. MFA_DISABLED
  results.push(await send(
    'MFA_DISABLED',
    'MFA disabled on an account',
    [
      'Two-factor authentication (MFA) has been disabled for the following account:',
      'Account: provider@sunshine-dental.com',
      'MFA is strongly recommended for all users who have access to patient claim data. Please review this change.',
    ].join('\n'),
    'Manage Users', `${base}/settings`,
  ));

  // 6. AR_THRESHOLD_30
  results.push(await send(
    'AR_THRESHOLD_30',
    'Claim unpaid — 30 days',
    [
      'A submitted claim has not been paid and may require follow-up.',
      'Patient: J.D.',
      'Payer: Delta Dental',
      'Amount: $1,240.00',
      'Days since submission: 30',
      'Please contact the payer to check claim status or consider filing an appeal.',
    ].join('\n'),
    'View Claim', `${base}/claims/${FAKE_CLAIM_ID}`,
  ));

  // 7. AR_THRESHOLD_60
  results.push(await send(
    'AR_THRESHOLD_60',
    'Claim unpaid — 60 days',
    [
      'A submitted claim has not been paid and may require follow-up.',
      'Patient: M.R.',
      'Payer: Anthem BCBS',
      'Amount: $875.00',
      'Days since submission: 60',
      'Please contact the payer to check claim status or consider filing an appeal.',
    ].join('\n'),
    'View Claim', `${base}/claims/${FAKE_CLAIM_ID}`,
  ));

  // 8. AR_THRESHOLD_90
  results.push(await send(
    'AR_THRESHOLD_90',
    'Claim unpaid — 90 days',
    [
      'A submitted claim has not been paid and may require follow-up.',
      'Patient: L.C.',
      'Payer: Cigna',
      'Amount: $540.00',
      'Days since submission: 90',
      'Please contact the payer to check claim status or consider filing an appeal.',
    ].join('\n'),
    'View Claim', `${base}/claims/${FAKE_CLAIM_ID}`,
  ));

  // 9. HIGH_VALUE_CLAIM_UNPAID
  results.push(await send(
    'HIGH_VALUE_CLAIM_UNPAID',
    'High-value claim unpaid past 30 days',
    [
      'A submitted claim has not been paid and may require follow-up.',
      'Patient: S.J.',
      'Payer: Aetna',
      'Amount: $2,150.00',
      'Days since submission: 32',
      'Please contact the payer to check claim status or consider filing an appeal.',
    ].join('\n'),
    'View Claim', `${base}/claims/${FAKE_CLAIM_ID}`,
  ));

  const sent    = results.filter(r => r.ok).length;
  const failed  = results.filter(r => !r.ok).length;

  return NextResponse.json({
    ok: failed === 0,
    sentTo: DEMO_EMAIL,
    sent,
    failed,
    results,
  });
}
