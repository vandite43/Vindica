/**
 * POST /api/cron/ar-alerts
 *
 * Nightly background job — checks claim ages and sends AR threshold notifications.
 * Protected by CRON_SECRET header to prevent unauthorised triggers.
 *
 * Triggers:
 *   - Claim SUBMITTED ≥ 30 days ago, still unpaid
 *   - Claim SUBMITTED ≥ 60 days ago, still unpaid
 *   - Claim SUBMITTED ≥ 90 days ago, still unpaid
 *   - Claim SUBMITTED ≥ 30 days ago, totalAmount ≥ $500, still unpaid
 *
 * Deduplication: the Notification table is queried before each send — the same
 * claim cannot trigger the same threshold alert more than once.
 *
 * Schedule this via Vercel Cron (vercel.json), GitHub Actions, or any cron service:
 *   POST https://your-domain.com/api/cron/ar-alerts
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeDecrypt } from '@/lib/security/encrypt';
import { notifyArThreshold } from '@/lib/notifications/send';

const UNPAID_STATUSES = ['SUBMITTED', 'PENDING', 'APPEALING'] as const;
const HIGH_VALUE_THRESHOLD = 500;

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Extract non-PHI patient initials from an encrypted patientName placeholder. */
function safeInitials(patientName: string): string {
  // patientName is AES-encrypted in the DB; the cron receives it decrypted via Prisma
  // We only use initials so no full name appears in notification payloads.
  const parts = patientName.trim().split(/\s+/);
  if (parts.length === 0) return '—';
  return parts.map(p => `${p[0].toUpperCase()}.`).join('');
}

export async function POST(req: NextRequest) {
  // Validate CRON_SECRET
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Load all submitted/unpaid claims with submittedAt set
    const claims = await prisma.claim.findMany({
      where: {
        status: { in: [...UNPAID_STATUSES] },
        submittedAt: { not: null },
      },
      select: {
        id:          true,
        practiceId:  true,
        patientName: true,
        payerName:   true,
        totalAmount: true,
        submittedAt: true,
      },
    });

    let alertsSent = 0;

    for (const claim of claims) {
      if (!claim.submittedAt) continue;

      const days = daysSince(claim.submittedAt);
      // Decrypt patientName (it's AES-encrypted; Prisma returns raw string)
      // We only derive initials — no full name in notifications.
      const decryptedName = safeDecrypt(claim.patientName);
      const initials = safeInitials(decryptedName);

      const tasks: Array<{
        type: 'AR_THRESHOLD_30' | 'AR_THRESHOLD_60' | 'AR_THRESHOLD_90' | 'HIGH_VALUE_CLAIM_UNPAID';
      }> = [];

      if (days >= 90)  tasks.push({ type: 'AR_THRESHOLD_90' });
      if (days >= 60)  tasks.push({ type: 'AR_THRESHOLD_60' });
      if (days >= 30)  tasks.push({ type: 'AR_THRESHOLD_30' });
      if (days >= 30 && claim.totalAmount >= HIGH_VALUE_THRESHOLD) {
        tasks.push({ type: 'HIGH_VALUE_CLAIM_UNPAID' });
      }

      for (const { type } of tasks) {
        await notifyArThreshold(
          claim.practiceId,
          claim.id,
          initials,
          claim.payerName,
          claim.totalAmount,
          days,
          type,
        );
        alertsSent++;
      }
    }

    return NextResponse.json({ ok: true, claimsChecked: claims.length, alertsSent });
  } catch (err) {
    console.error('[cron/ar-alerts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
