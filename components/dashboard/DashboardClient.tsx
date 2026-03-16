'use client';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
import DenialRiskBadge from '@/components/claims/DenialRiskBadge';
import { FileText, TrendingDown, DollarSign, TrendingUp, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecentClaim {
  id: string;
  patientName: string;
  payerName: string;
  status: string;
  totalAmount: number;
  denialRiskScore?: number | null;
  riskLevel?: string | null;
  serviceDate: string;
}

interface DashboardData {
  kpis: {
    claimsThisMonth: number;
    denialRate: string;
    revenueAtRisk: number;
    recoveredRevenue: number;
  };
  trendData: { month: string; denialRate: number; total: number }[];
  payerData: { name: string; total: number; denied: number; denialRate: number }[];
  recentClaims: RecentClaim[];
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const { kpis, trendData, payerData, recentClaims } = data;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Claims This Month"
          value={kpis.claimsThisMonth.toString()}
          subtitle="Total submitted"
          icon={FileText}
          color="text-blue-600"
        />
        <KPICard
          title="Denial Rate"
          value={`${kpis.denialRate}%`}
          subtitle="Industry avg: 13%"
          icon={TrendingDown}
          color={parseFloat(kpis.denialRate) > 13 ? 'text-red-600' : 'text-green-600'}
        />
        <KPICard
          title="Revenue at Risk"
          value={formatCurrency(kpis.revenueAtRisk)}
          subtitle="From denied claims"
          icon={DollarSign}
          color="text-orange-600"
        />
        <KPICard
          title="Recovered via Appeals"
          value={formatCurrency(kpis.recoveredRevenue)}
          subtitle="Appeal wins"
          icon={TrendingUp}
          color="text-emerald-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Denial Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Denial Rate Trend (6 Months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 30]} />
              <Tooltip formatter={(v) => [`${v}%`, 'Denial Rate']} />
              <Line
                type="monotone"
                dataKey="denialRate"
                stroke="#0F4C81"
                strokeWidth={2}
                dot={{ fill: '#0F4C81', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payer Denial Rates */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Payer Denial Rates</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={payerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 30]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v) => [`${v}%`, 'Denial Rate']} />
              <Bar dataKey="denialRate" fill="#00B4A2" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payer Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Payer Performance Summary</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-2 font-medium text-gray-600">Payer</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Claims</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Denied</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Denial Rate</th>
            </tr>
          </thead>
          <tbody>
            {payerData.map((payer, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-2.5 font-medium text-gray-900">{payer.name}</td>
                <td className="px-5 py-2.5 text-gray-600">{payer.total}</td>
                <td className="px-5 py-2.5 text-red-600">{payer.denied}</td>
                <td className="px-5 py-2.5">
                  <span className={payer.denialRate > 15 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                    {payer.denialRate}%
                  </span>
                </td>
              </tr>
            ))}
            {payerData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                  No claim data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Claims */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Claims</h3>
          <Link href="/claims">
            <Button variant="ghost" size="sm" className="text-xs text-[#0F4C81]">
              View all
            </Button>
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-2 font-medium text-gray-600">Patient</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Payer</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Amount</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Service Date</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Status</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600">Risk</th>
              <th className="text-left px-5 py-2 font-medium text-gray-600" />
            </tr>
          </thead>
          <tbody>
            {recentClaims.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                  No claims yet.{' '}
                  <Link href="/claims/new" className="text-[#0F4C81] hover:underline">
                    Submit your first claim.
                  </Link>
                </td>
              </tr>
            ) : (
              recentClaims.map(claim => (
                <tr key={claim.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium text-gray-900">{claim.patientName}</td>
                  <td className="px-5 py-2.5 text-gray-600">{claim.payerName}</td>
                  <td className="px-5 py-2.5">{formatCurrency(claim.totalAmount)}</td>
                  <td className="px-5 py-2.5 text-gray-500">{formatDate(claim.serviceDate)}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_COLORS[claim.status] || STATUS_COLORS.DRAFT
                      )}
                    >
                      {claim.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <DenialRiskBadge
                      riskLevel={claim.riskLevel}
                      score={claim.denialRiskScore}
                      size="sm"
                    />
                  </td>
                  <td className="px-5 py-2.5">
                    <Link href={`/claims/${claim.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {!claim.riskLevel ? (
                          <>
                            <Brain className="h-3 w-3 mr-1 text-blue-500" /> Analyze
                          </>
                        ) : (
                          'View'
                        )}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
