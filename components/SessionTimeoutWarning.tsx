'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AlertTriangle } from 'lucide-react';

const WARN_MS  = 13 * 60 * 1000; // 13 minutes — show warning
const LIMIT_MS = 15 * 60 * 1000; // 15 minutes — force logout

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export default function SessionTimeoutWarning() {
  const { status } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const warnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (warnTimer.current)   clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }

  function resetTimers() {
    clearTimers();
    setShowWarning(false);
    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, WARN_MS);
    logoutTimer.current = setTimeout(() => {
      signOut({ callbackUrl: '/login?reason=timeout' });
    }, LIMIT_MS);
  }

  useEffect(() => {
    if (status !== 'authenticated') return;

    resetTimers();

    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, resetTimers, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, resetTimers));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status !== 'authenticated' || !showWarning) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="timeout-title"
      aria-describedby="timeout-desc"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="timeout-title" className="text-sm font-semibold text-gray-900 mb-1">
              Session Expiring Soon
            </h2>
            <p id="timeout-desc" className="text-sm text-gray-600">
              Your session will expire in 2 minutes due to inactivity. Click anywhere to stay logged in.
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={() => signOut({ callbackUrl: '/login?reason=timeout' })}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Log Out Now
          </button>
          <button
            onClick={resetTimers}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#5B3FD4' }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
