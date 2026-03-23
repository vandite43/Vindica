'use client';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VindicaMark } from '@/components/layout/VindicaMark';

const RESEND_COOLDOWN = 60; // seconds

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') ?? '';
  const email  = searchParams.get('email')  ?? '';

  const [digits, setDigits]     = useState<string[]>(Array(6).fill(''));
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // 60-second countdown before allowing resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1); // keep only last digit
    setDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; });
      }
    }
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  }, []);

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < 6) { setError('Please enter all 6 digits.'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Invalid or expired code. Please try again.');
        setDigits(Array(6).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      // Code verified — create the NextAuth session via the mfaToken path
      const result = await signIn('credentials', {
        email: data.email,
        mfaToken: data.mfaToken,
        redirect: false,
      });

      if (result?.error) {
        setError('Verification succeeded but sign-in failed. Please try again.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await fetch('/api/auth/send-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
      setResendCooldown(RESEND_COOLDOWN);
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1A1033' }}>
      <Card className="w-full max-w-md shadow-xl" style={{ backgroundColor: '#F8F7FF' }}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <VindicaMark size={48} />
          </div>
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Trebuchet MS, Segoe UI, sans-serif' }}
          >
            Check your email
          </h1>
          <CardDescription className="mt-1">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-gray-700">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 6 digit inputs */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                autoFocus={i === 0}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold rounded-lg border-2 bg-white
                           focus:outline-none transition-colors"
                style={{
                  borderColor: digit ? '#5B3FD4' : '#E5E7EB',
                  color: '#1A1033',
                }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Verify button */}
          <Button
            onClick={handleVerify}
            disabled={loading || digits.join('').length < 6}
            className="w-full text-white font-semibold"
            style={{ backgroundColor: '#5B3FD4' }}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </Button>

          {/* Resend */}
          <p className="text-center text-sm text-gray-500">
            Didn&apos;t receive a code?{' '}
            {resendCooldown > 0 ? (
              <span className="text-gray-400">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="font-medium hover:underline disabled:opacity-50"
                style={{ color: '#5B3FD4' }}
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
