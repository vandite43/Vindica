'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bell, ShieldAlert, LogIn, UserPlus, UserCog, ShieldOff, Clock, TrendingUp } from 'lucide-react';

// ── Notification catalogue ────────────────────────────────────────────────────

type NotifKey =
  | 'FAILED_LOGIN'
  | 'NEW_DEVICE_LOGIN'
  | 'NEW_USER_ADDED'
  | 'ROLE_CHANGED'
  | 'MFA_DISABLED'
  | 'AR_THRESHOLD_30'
  | 'AR_THRESHOLD_60'
  | 'AR_THRESHOLD_90'
  | 'HIGH_VALUE_CLAIM_UNPAID';

interface NotifDef {
  key: NotifKey;
  label: string;
  summary: string;    // one line shown in the card
  detail: string;     // when it fires + what the email includes
  icon: React.ElementType;
  group: 'security' | 'team' | 'ar';
}

const NOTIFICATIONS: NotifDef[] = [
  // ── Security ───────────────────────────────────────────────────────────────
  {
    key: 'FAILED_LOGIN',
    label: 'Failed login alert',
    summary: '3+ failed login attempts within 10 minutes on any account.',
    detail:
      'Triggered when the same user account receives 3 or more consecutive failed password attempts within a 10-minute window. The email includes the account email and the source IP address.',
    icon: ShieldAlert,
    group: 'security',
  },
  {
    key: 'NEW_DEVICE_LOGIN',
    label: 'Login from new location',
    summary: 'Successful login detected from an IP not previously seen for an account.',
    detail:
      'Triggered on every successful MFA login when the request IP differs from the last recorded IP for that account. The email includes the account email, new IP, and previous IP. Does not fire on the very first login.',
    icon: LogIn,
    group: 'security',
  },
  {
    key: 'MFA_DISABLED',
    label: 'MFA disabled on an account',
    summary: 'Two-factor authentication was turned off for any user.',
    detail:
      'Triggered immediately when an admin disables MFA for any team member account. The email names the affected account so you can verify the change was intentional.',
    icon: ShieldOff,
    group: 'security',
  },
  // ── Team ──────────────────────────────────────────────────────────────────
  {
    key: 'NEW_USER_ADDED',
    label: 'New team member added',
    summary: 'A new user account was created in your practice.',
    detail:
      'Triggered when any admin creates a new user via the User Management panel. The email includes the new account email, assigned role, and who performed the action.',
    icon: UserPlus,
    group: 'team',
  },
  {
    key: 'ROLE_CHANGED',
    label: 'User role changed',
    summary: "An existing user's role was updated by an admin.",
    detail:
      "Triggered when a user's role is changed (e.g., Biller → Office Manager). The email includes the affected account email, the old role, the new role, and who made the change.",
    icon: UserCog,
    group: 'team',
  },
  // ── AR / Collections ──────────────────────────────────────────────────────
  {
    key: 'AR_THRESHOLD_30',
    label: '30-day unpaid claim',
    summary: 'A submitted claim has not been paid after 30 days.',
    detail:
      'Checked nightly. Fires once per claim at the 30-day mark. The email includes patient initials, payer name, claim amount, and a direct link to the claim. Does not re-alert once sent.',
    icon: Clock,
    group: 'ar',
  },
  {
    key: 'AR_THRESHOLD_60',
    label: '60-day unpaid claim',
    summary: 'A submitted claim has not been paid after 60 days.',
    detail:
      'Checked nightly. Fires once per claim at the 60-day mark. Includes the same details as the 30-day alert. Does not re-alert once sent.',
    icon: Clock,
    group: 'ar',
  },
  {
    key: 'AR_THRESHOLD_90',
    label: '90-day unpaid claim',
    summary: 'A submitted claim has not been paid after 90 days.',
    detail:
      'Checked nightly. Fires once per claim at the 90-day mark. At this stage the claim may need to be written off or escalated to collections.',
    icon: Clock,
    group: 'ar',
  },
  {
    key: 'HIGH_VALUE_CLAIM_UNPAID',
    label: 'High-value claim overdue ($500+)',
    summary: 'A claim over $500 has not been paid after 30 days.',
    detail:
      'Checked nightly. Fires once per claim when the total amount is $500 or more and the claim has been submitted for 30+ days without payment. Separate from the standard 30-day alert.',
    icon: TrendingUp,
    group: 'ar',
  },
];

const GROUPS = [
  { key: 'security', label: 'Security' },
  { key: 'team',     label: 'Team Activity' },
  { key: 'ar',       label: 'AR & Collections' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationPreferencesCard() {
  const [prefs, setPrefs]       = useState<Record<NotifKey, boolean> | null>(null);
  const [saving, setSaving]     = useState<NotifKey | null>(null);
  const [expanded, setExpanded] = useState<NotifKey | null>(null);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then(r => r.json())
      .then(data => {
        // Treat missing key as enabled (default on)
        const loaded: Record<string, boolean> = data.prefs ?? {};
        const full = Object.fromEntries(
          NOTIFICATIONS.map(n => [n.key, loaded[n.key] !== false])
        ) as Record<NotifKey, boolean>;
        setPrefs(full);
      })
      .catch(() => toast.error('Could not load notification preferences.'));
  }, []);

  async function toggle(key: NotifKey) {
    if (!prefs || saving) return;
    const next = !prefs[key];
    setPrefs(p => ({ ...p!, [key]: next }));
    setSaving(key);
    try {
      const res = await fetch('/api/settings/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success(next ? 'Notification enabled.' : 'Notification disabled.');
    } catch {
      // Revert on failure
      setPrefs(p => ({ ...p!, [key]: !next }));
      toast.error('Failed to save preference. Please try again.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#5B3FD4]" />
          <CardTitle className="text-base">Notification Preferences</CardTitle>
        </div>
        <CardDescription className="text-sm text-gray-500 mt-1">
          Security and AR alerts are emailed to the practice administrator only. Toggle each type
          on or off — all are enabled by default.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {GROUPS.map(group => (
          <div key={group.key}>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              {group.label}
            </p>

            <div className="space-y-2">
              {NOTIFICATIONS.filter(n => n.group === group.key).map(notif => {
                const Icon    = notif.icon;
                const enabled = prefs ? (prefs[notif.key] !== false) : true;
                const isOpen  = expanded === notif.key;

                return (
                  <div
                    key={notif.key}
                    className={`rounded-lg border transition-colors ${
                      enabled ? 'border-[#E8E6F0] bg-white' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    {/* Row */}
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className={`mt-0.5 rounded-md p-1.5 ${
                        enabled ? 'bg-[#E8E4FF] text-[#5B3FD4]' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm font-medium ${enabled ? 'text-[#1A1033]' : 'text-gray-400'}`}>
                            {notif.label}
                          </span>

                          {/* Toggle */}
                          <button
                            onClick={() => toggle(notif.key)}
                            disabled={saving === notif.key || prefs === null}
                            aria-label={enabled ? 'Disable' : 'Enable'}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                              transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FD4]
                              ${enabled ? 'bg-[#5B3FD4]' : 'bg-gray-200'}
                              ${saving === notif.key ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                                transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                          </button>
                        </div>

                        <p className={`text-xs mt-0.5 leading-relaxed ${enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                          {notif.summary}
                        </p>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpanded(isOpen ? null : notif.key)}
                          className="text-xs text-[#8B72E8] hover:text-[#5B3FD4] mt-1 focus:outline-none"
                        >
                          {isOpen ? 'Less detail ↑' : 'What does this email include? ↓'}
                        </button>

                        {/* Detail panel */}
                        {isOpen && (
                          <p className="mt-2 text-xs text-gray-500 leading-relaxed bg-[#F0EEFF] rounded-md px-3 py-2 border border-[#E8E4FF]">
                            {notif.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
