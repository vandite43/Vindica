'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, FileText, DollarSign, TrendingUp, AlertCircle, Clock, Award, Users } from 'lucide-react';

interface Stats {
  practice: { name: string; npi: string | null; address: string | null; state: string | null };
  totalClaims: number;
  totalBilled: number;
  approvedRevenue: number;
  deniedAmount: number;
  pendingAmount: number;
  recoveredRevenue: number;
  appealWinRate: number | null;
  totalAppeals: number;
  wonAppeals: number;
  lostAppeals: number;
  activeUsers: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function KPI({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
          </div>
          <div className="rounded-lg p-2" style={{ backgroundColor: color + '20' }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonKPI() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-7 w-32 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PracticeStats() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch('/api/practice/stats')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(setStats)
      .catch(() => setError('Failed to load practice stats'))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Practice header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2" style={{ backgroundColor: '#5B3FD420' }}>
          <Building2 className="h-5 w-5" style={{ color: '#5B3FD4' }} />
        </div>
        <div>
          {loading
            ? <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
            : <h2 className="font-semibold text-gray-900">{stats?.practice.name}</h2>
          }
          {loading
            ? <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200" />
            : <p className="text-xs text-gray-400">
                {[stats?.practice.npi && `NPI: ${stats.practice.npi}`, stats?.practice.state].filter(Boolean).join(' · ')}
              </p>
          }
        </div>
      </div>

      {/* KPI grid — row 1 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)
        ) : stats ? (
          <>
            <KPI icon={FileText}    label="Total Claims"        value={stats.totalClaims.toString()} color="#5B3FD4" />
            <KPI icon={DollarSign}  label="Total Billed"        value={fmt(stats.totalBilled)}        color="#5B3FD4" />
            <KPI icon={TrendingUp}  label="Approved Revenue"    value={fmt(stats.approvedRevenue)}    color="#3BBFB0" sub="APPROVED + WON appeals" />
            <KPI icon={Award}       label="Recovered via Appeals" value={fmt(stats.recoveredRevenue)} color="#3BBFB0" sub={`${stats.wonAppeals} appeal${stats.wonAppeals !== 1 ? 's' : ''} won`} />
          </>
        ) : null}
      </div>

      {/* KPI grid — row 2 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)
        ) : stats ? (
          <>
            <KPI icon={AlertCircle} label="Denied Amount"   value={fmt(stats.deniedAmount)}   color="#DC2626" sub={`${stats.lostAppeals} appeal${stats.lostAppeals !== 1 ? 's' : ''} lost`} />
            <KPI icon={Clock}       label="Pending Amount"  value={fmt(stats.pendingAmount)}   color="#D97706" sub="Pending + submitted + appealing" />
            <KPI
              icon={Award}
              label="Appeal Win Rate"
              value={stats.appealWinRate !== null ? `${stats.appealWinRate}%` : '—'}
              color="#3BBFB0"
              sub={stats.totalAppeals > 0 ? `${stats.totalAppeals} total appeals` : 'No resolved appeals yet'}
            />
            <KPI icon={Users} label="Active Users" value={stats.activeUsers.toString()} color="#5B3FD4" />
          </>
        ) : null}
      </div>
    </div>
  );
}
