'use client';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VyndicoLogo } from '@/components/layout/VyndicoLogo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timedOut = searchParams.get('reason') === 'timeout';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: validate credentials without creating a session
      const checkRes = await fetch('/api/auth/credentials-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!checkRes.ok) {
        const data = await checkRes.json();
        setError(data.error || 'Invalid email or password');
        return;
      }

      const { userId, mfaEnabled } = await checkRes.json();

      if (mfaEnabled) {
        // Step 2a: send MFA code and redirect to verify page
        await fetch('/api/auth/send-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        router.push(`/auth/verify?userId=${userId}&email=${encodeURIComponent(email)}`);
        return;
      }

      // Step 2b: MFA disabled — create session directly
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Sign in failed. Please try again.');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1A1033' }}>
      <Card className="w-full max-w-md shadow-xl" style={{ backgroundColor: '#F8F7FF' }}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <VyndicoLogo />
          </div>
          <CardDescription>Sign in to your practice account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {timedOut && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm">
                You were logged out due to inactivity.
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: '#5B3FD4' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium hover:underline" style={{ color: '#5B3FD4' }}>Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
