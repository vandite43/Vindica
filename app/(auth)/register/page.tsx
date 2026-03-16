'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VindicaMark } from '@/components/layout/VindicaMark';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', practiceName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Registration failed');
    } else {
      router.push('/login?registered=true');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1A1033' }}>
      <Card className="w-full max-w-md shadow-xl" style={{ backgroundColor: '#F8F7FF' }}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <VindicaMark size={56} />
          </div>
          <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Trebuchet MS, Segoe UI, sans-serif', color: '#1A1033' }}>
            Create Account
          </CardTitle>
          <CardDescription>Set up your practice on Vindica</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{error}</div>}
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Dr. Jane Smith" required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@dental.com" required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 characters" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label>Practice Name</Label>
              <Input value={form.practiceName} onChange={e => setForm({...form, practiceName: e.target.value})} placeholder="Sunshine Family Dentistry" required />
            </div>
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: '#5B3FD4' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: '#5B3FD4' }}>Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
