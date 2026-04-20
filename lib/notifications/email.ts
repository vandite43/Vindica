/**
 * Vyndico transactional email service — wraps the Resend SDK.
 *
 * All emails share a branded HTML template (deep violet #5B3FD4, DM Sans).
 * No PHI is included in any email body — only IDs and metadata.
 *
 * Required env vars:
 *   RESEND_API_KEY    — Resend API key (re_...)
 *   RESEND_FROM_EMAIL — verified sender address (e.g. alerts@yourdomain.com)
 *   NEXT_PUBLIC_APP_URL — base URL for CTA links (e.g. https://app.Vyndico.ai)
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'alerts@Vyndico.ai';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ── HTML template ─────────────────────────────────────────────────────────────

function buildHtml({
  practiceName,
  subject,
  body,
  ctaLabel,
  ctaUrl,
  timestamp,
}: {
  practiceName: string;
  subject: string;
  body: string;        // plain-text paragraphs, newlines converted to <br>
  ctaLabel?: string;
  ctaUrl?: string;
  timestamp: Date;
}): string {
  const formattedTime = timestamp.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  });

  const bodyHtml = body
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin:0 0 12px 0;color:#374151;font-size:15px;line-height:1.6;">${line}</p>`)
    .join('\n');

  const ctaBlock = ctaLabel && ctaUrl
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:#5B3FD4;color:#ffffff;font-family:'DM Sans',Arial,sans-serif;
                  font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
          ${ctaLabel}
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F0EEFF;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEFF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#5B3FD4;border-radius:12px 12px 0 0;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:24px;
                                 font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                      Vyndi<span style="color:#C4B5FD;">co</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.15em;
                                 text-transform:uppercase;">Security Alert</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;
                       box-shadow:0 4px 24px rgba(91,63,212,0.08);">

              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1A1033;">${subject}</h1>
              <p style="margin:0 0 28px 0;font-size:13px;color:#8B72E8;">
                ${practiceName} · ${formattedTime} ET
              </p>

              <hr style="border:none;border-top:1px solid #E8E6F0;margin:0 0 24px 0;">

              ${bodyHtml}

              ${ctaBlock}

              <hr style="border:none;border-top:1px solid #E8E6F0;margin:24px 0 20px 0;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                This is an automated security notification from Vyndico sent to the practice administrator.
                If you did not expect this alert, please review your account immediately.
                <br><br>
                © ${new Date().getFullYear()} Vyndico · Intelligent Claims Recovery
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── sendEmail ─────────────────────────────────────────────────────────────────

/**
 * Sends a single branded notification email.
 * Swallows errors and logs them — email failure must never crash a request.
 */
export async function sendEmail({
  to,
  subject,
  practiceName,
  body,
  ctaLabel,
  ctaUrl,
}: {
  to: string;
  subject: string;
  practiceName: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<void> {
  try {
    const html = buildHtml({
      practiceName,
      subject,
      body,
      ctaLabel,
      ctaUrl,
      timestamp: new Date(),
    });

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `[Vyndico] ${subject}`,
      html,
    });

    if (error) {
      console.error('[notifications] Resend error:', error);
    }
  } catch (err) {
    console.error('[notifications] sendEmail failed:', err);
  }
}

// ── sendMfaEmail ──────────────────────────────────────────────────────────────

/**
 * Sends the 6-digit MFA verification code email.
 * Uses the same branded template but with a large code block instead of paragraphs.
 */
export async function sendMfaEmail({
  to,
  code,
  practiceName,
}: {
  to: string;
  code: string;
  practiceName: string;
}): Promise<void> {
  try {
    const timestamp = new Date();
    const formattedTime = timestamp.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/New_York',
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Vyndico verification code</title>
</head>
<body style="margin:0;padding:0;background:#F0EEFF;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEFF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#5B3FD4;border-radius:12px 12px 0 0;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:24px;
                                 font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                      Vyndi<span style="color:#C4B5FD;">co</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.15em;
                                 text-transform:uppercase;">Verification Code</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;
                       box-shadow:0 4px 24px rgba(91,63,212,0.08);">

              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1A1033;">
                Your verification code
              </h1>
              <p style="margin:0 0 28px 0;font-size:13px;color:#8B72E8;">
                ${practiceName} · ${formattedTime} ET
              </p>

              <hr style="border:none;border-top:1px solid #E8E6F0;margin:0 0 28px 0;">

              <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
                Enter the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.
              </p>

              <!-- Code block -->
              <div style="text-align:center;margin:32px 0;">
                <div style="display:inline-block;background:#F0EEFF;border:2px solid #C4B5FD;
                            border-radius:12px;padding:20px 48px;">
                  <span style="font-family:'Courier New',Courier,monospace;font-size:40px;
                               font-weight:700;color:#5B3FD4;letter-spacing:10px;">
                    ${code}
                  </span>
                </div>
              </div>

              <p style="margin:0 0 0 0;color:#374151;font-size:15px;line-height:1.6;">
                If you did not request this code, someone may be attempting to access your account.
                No action is needed — this code will expire automatically.
              </p>

              <hr style="border:none;border-top:1px solid #E8E6F0;margin:24px 0 20px 0;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                This is an automated security notification from Vyndico sent to the practice administrator.
                If you did not expect this alert, please review your account immediately.
                <br><br>
                © ${new Date().getFullYear()} Vyndico · Intelligent Claims Recovery
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: '[Vyndico] Your verification code',
      html,
    });

    if (error) {
      console.error('[notifications] Resend MFA error:', error);
    }
  } catch (err) {
    console.error('[notifications] sendMfaEmail failed:', err);
  }
}

export { APP_URL };
