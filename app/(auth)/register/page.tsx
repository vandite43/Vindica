'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-gradient-to-br from-[#0F4C81] to-[#1E6BB8] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-[#0F4C81] rounded-xl flex items-center justify-center">
              <Shield className="h-7 w-7 text-[#00B4A2]" />
            </div>
          </div>
          <CardTitle className="text-2xl" style={{ fontFamily: 'Instrument Serif, serif' }}>Create Account</CardTitle>
          <CardDescription>Set up your practice on ClaimGuard AI</CardDescription>
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
            <Button type="submit" className="w-full bg-[#0F4C81] hover:bg-[#1E6BB8]" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0F4C81] font-medium hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
