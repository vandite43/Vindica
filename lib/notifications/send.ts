/**
 * High-level notification triggers.
 *
 * Each exported function:
 *   1. Looks up the practice admin email(s)
 *   2. Saves a Notification record to the DB (idempotent for AR alerts)
 *   3. Sends the branded email via Resend
 *
 * All functions are fire-and-forget safe — errors are caught and logged.
 * No PHI is stored in Notification.payload or sent in emails.
 */

import { prisma } from '@/lib/db';
import { sendEmail, APP_URL } from './email';

// ── Admin lookup + preference check ──────────────────────────────────────────

/**
 * Returns the email address of the practice owner (the ADMIN who created the practice).
 * Falls back to any active ADMIN member if the owner is somehow unreachable.
 * Also returns notificationPrefs so callers can gate sends without a second DB hit.
 */
async function getAdminEmail(practiceId: string): Promise<{
  email: string;
  practiceName: string;
  prefs: Record<string, boolean>;
} | null> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      user: { select: { email: true, role: true, isActive: true } },
      members: { where: { role: 'ADMIN', isActive: true }, select: { email: true } },
    },
  });

  if (!practice) return null;

  const adminEmail =
    practice.user.isActive && practice.user.role === 'ADMIN'
      ? practice.user.email
      : practice.members[0]?.email ?? null;

  if (!adminEmail) return null;

  return {
    email: adminEmail,
    practiceName: practice.name,
    prefs: (practice.notificationPrefs as Record<string, boolean>) ?? {},
  };
}

/** Returns true if the notification type is enabled (default: true when key absent). */
function isEnabled(prefs: Record<string, boolean>, type: string): boolean {
  return prefs[type] !== false;
}

/** Saves notification record. Returns false if a duplicate AR-threshold record exists. */
async function saveNotification(
  practiceId: string,
  type: string,
  payload: Record<string, unknown>,
  userId?: string,
): Promise<boolean> {
  try {
    // For AR threshold types, prevent re-alerting the same claim at the same threshold
    const arTypes = ['AR_THRESHOLD_30', 'AR_THRESHOLD_60', 'AR_THRESHOLD_90', 'HIGH_VALUE_CLAIM_UNPAID'];
    if (arTypes.includes(type) && payload.claimId) {
      const existing = await prisma.notification.findFirst({
        where: {
          practiceId,
          type: type as never,
          payload: { path: ['claimId'], equals: payload.claimId },
        },
      });
      if (existing) return false; // already alerted
    }

    await prisma.notification.create({
      data: {
        practiceId,
        userId: userId ?? null,
        type: type as never,
        payload: payload as never,
      },
    });
    return true;
  } catch (err) {
    console.error('[notifications] saveNotification failed:', err);
    return false;
  }
}

// ── Trigger functions ─────────────────────────────────────────────────────────

/** Called when 3+ failed login attempts detected within 10 minutes for a user. */
export async function notifyFailedLogins(
  practiceId: string,
  targetEmail: string,
  count: number,
  ipAddress?: string,
): Promise<void> {
  const admin = await getAdminEmail(practiceId);
  if (!admin || !isEnabled(admin.prefs, 'FAILED_LOGIN')) return;

  const saved = await saveNotification(practiceId, 'FAILED_LOGIN', {
    targetEmail,
    count,
    ipAddress: ipAddress ?? 'unknown',
  });
  if (!saved) return;

  await sendEmail({
    to: admin.email,
    subject: 'Failed login alert',
    practiceName: admin.practiceName,
    body: [
      `${count} consecutive failed login attempts have been detected for the account:`,
      `Account: ${targetEmail}`,
      `IP address: ${ipAddress ?? 'unknown'}`,
      `This may indicate a brute-force attempt. If you do not recognise this activity, consider resetting the password for this account immediately.`,
    ].join('\n'),
    ctaLabel: 'Review Users',
    ctaUrl: `${APP_URL}/settings`,
  });
}

/** Called on successful login when the IP differs from the last known IP. */
export async function notifyNewDeviceLogin(
  practiceId: string,
  userId: string,
  userEmail: string,
  newIp: string,
  previousIp: string | null,
): Promise<void> {
  const admin = await getAdminEmail(practiceId);
  if (!admin || !isEnabled(admin.prefs, 'NEW_DEVICE_LOGIN')) return;

  await saveNotification(practiceId, 'NEW_DEVICE_LOGIN', { userEmail, newIp, previousIp }, userId);

  await sendEmail({
    to: admin.email,
    subject: 'Login from new location',
    practiceName: admin.practiceName,
    body: [
      `A successful login was detected from an IP address not previously seen for this account.`,
      `Account: ${userEmail}`,
      `New IP: ${newIp}`,
      `Previous IP: ${previousIp ?? 'none on record'}`,
      `If this login was expected, no action is needed. If it was not, please investigate immediately.`,
    ].join('\n'),
    ctaLabel: 'View Audit Log',
    ctaUrl: `${APP_URL}/settings`,
  });
}

/** Called when a new user account is created. */
export async function notifyNewUserAdded(
  practiceId: string,
  newUserId: string,
  newUserEmail: string,
  newUserRole: string,
  addedByEmail: string,
): Promise<void> {
  const admin = await getAdminEmail(practiceId);
  if (!admin || !isEnabled(admin.prefs, 'NEW_USER_ADDED')) return;

  await saveNotification(
    practiceId,
    'NEW_USER_ADDED',
    { newUserEmail, newUserRole, addedByEmail },
    newUserId,
  );

  await sendEmail({
    to: admin.email,
    subject: 'New team member added',
    practiceName: admin.practiceName,
    body: [
      `A new user account has been created in your Vyndico practice.`,
      `Email: ${newUserEmail}`,
      `Role: ${newUserRole}`,
      `Added by: ${addedByEmail}`,
      `If you did not authorise this, please review your team immediately.`,
    ].join('\n'),
    ctaLabel: 'Manage Users',
    ctaUrl: `${APP_URL}/settings`,
  });
}

/** Called when a user's role is changed. */
export async function notifyRoleChanged(
  practiceId: string,
  targetUserId: string,
  targetEmail: string,
  oldRole: string,
  newRole: string,
  changedByEmail: string,
): Promise<void> {
  const admin = await getAdminEmail(practiceId);
  if (!admin || !isEnabled(admin.prefs, 'ROLE_CHANGED')) return;

  await saveNotification(
    practiceId,
    'ROLE_CHANGED',
    { targetEmail, oldRole, newRole, changedByEmail },
    targetUserId,
  );

  await sendEmail({
    to: admin.email,
    subject: 'User role changed',
    practiceName: admin.practiceName,
    body: [
      `A user's role has been changed in your Vyndico practice.`,
      `Account: ${targetEmail}`,
      `Previous role: ${oldRole}`,
      `New role: ${newRole}`,
      `Changed by: ${changedByEmail}`,
    ].join('\n'),
    ctaLabel: 'Manage Users',
    ctaUrl: `${APP_URL}/settings`,
  });
}

/** Called when MFA is disabled on any account. */
export async function notifyMfaDisabled(
  practiceId: string,
  targetUserId: string,
  targetEmail: string,
): Promise<void> {
  const admin = await getAdminEmail(practiceId);
  if (!admin || !isEnabled(admin.prefs, 'MFA_DISABLED')) return;

  await saveNotification(practiceId, 'MFA_DISABLED', { targetEmail }, targetUserId);

  await sendEmail({
    to: admin.email,
    subject: 'MFA disabled on an account',
    practiceName: admin.practiceName,
    body: [
      `Two-factor authentication (MFA) has been disabled for the following account:`,
      `Account: ${targetEmail}`,
      `MFA is strongly recommended for all users who have access to patient claim data. Please review this change.`,
    ].join('\n'),
    ctaLabel: 'Manage Users',
    ctaUrl: `${APP_URL}/settings`,
  });
}

/** Called by the nightly cron for unpaid claim thresholds (30/60/90 days). */
export async function notifyArThreshold(
  practiceId: string,
  claimId: string,
  patientInitials: string, // e.g. "J.D." — no full name, no PHI
  payerName: string,
  totalAmount: number,
  daysPastSubmission: number,
  type: 'AR_THRESHOLD_30' | 'AR_THRESHOLD_60' | 'AR_THRESHOLD_90' | 'HIGH_VALUE_CLAIM_UNPAID',
): Promise<void> {
  const admin = await getAdminEmail(practiceId);
  if (!admin || !isEnabled(admin.prefs, type)) return;

  const saved = await saveNotification(practiceId, type, {
    claimId,
    patientInitials,
    payerName,
    totalAmount,
    daysPastSubmission,
  });
  if (!saved) return; // already alerted at this threshold

  const label =
    type === 'HIGH_VALUE_CLAIM_UNPAID'
      ? 'High-value claim unpaid past 30 days'
      : `Claim unpaid — ${daysPastSubmission} days`;

  await sendEmail({
    to: admin.email,
    subject: label,
    practiceName: admin.practiceName,
    body: [
      `A submitted claim has not been paid and may require follow-up.`,
      `Patient: ${patientInitials}`,
      `Payer: ${payerName}`,
      `Amount: $${totalAmount.toFixed(2)}`,
      `Days since submission: ${daysPastSubmission}`,
      `Please contact the payer to check claim status or consider filing an appeal.`,
    ].join('\n'),
    ctaLabel: 'View Claim',
    ctaUrl: `${APP_URL}/claims/${claimId}`,
  });
}
