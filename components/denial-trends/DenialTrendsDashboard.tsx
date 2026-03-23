'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertCircle, AlertTriangle,
  DollarSign, Building2, Stethoscope, ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface DenialAnalyticsResponse {
  isSampleData: boolean;
  overallDenialRate: number;
  previousDenialRate: number;
  revenueAtRisk: number;
  mostDeniedPayer: { name: string; count: number } | null;
  mostDeniedProcedure: { code: string; description: string; count: number } | null;
  denialTrend: { month: string; submitted: number; denied: number; denialRate: number }[];
  payerBreakdown: { name: string; submitted: number; denied: number; denialRate: number; revenueAtRisk: number; previousDenialRate: number }[];
  cdtBreakdown: { code: string; description: string; submittedCount: number; deniedCount: number; denialRate: number; revenueAtRisk: number; topDenialCode: string; topDenialReason: string }[];
  reasonBreakdown: { category: string; carcCodes: string[]; count: number; percentage: number; avgOverturnRate: string; priority: 'High' | 'Low' | 'Fatal' }[];
  providerBreakdown: { providerName: string; submitted: number; denied: number; denialRate: number; topDenialReason: string }[];
  alerts: { type: 'red' | 'yellow'; message: string }[];
}

type RangeKey = '1m' | '3m' | '6m' | '12m' | 'custom';

// ── Colour helpers ────────────────────────────────────────────────────────────

function rateColor(rate: number): string {
  if (rate < 5)  return '#16A34A';
  if (rate < 10) return '#D97706';
  return '#DC2626';
}

function rateBgClass(rate: number): string {
  if (rate < 5)  return 'bg-green-50 text-green-700';
  if (rate < 10) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function revenueBgClass(amount: number): string {
  if (amount < 5000)  return 'text-green-600';
  if (amount < 10000) return 'text-amber-600';
  return 'text-red-600';
}

const DONUT_COLORS = ['#5B3FD4','#3BBFB0','#DC2626','#D97706','#EA580C','#0F4C81','#7C3AED','#059669','#6B7280'];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ h = 'h-64' }: { h?: string }) {
  return <div className={`${h} rounded-xl bg-gray-100 animate-pulse`} />;
}

// ── Custom tooltip for line chart ─────────────────────────────────────────────

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { submitted: number; denied: number; denialRate: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      <p className="text-gray-600">Submitted: <span className="font-medium text-gray-900">{d.submitted}</span></p>
      <p className="text-gray-600">Denied: <span className="font-medium text-red-600">{d.denied}</span></p>
      <p className="text-gray-600">Denial Rate: <span className="font-medium" style={{ color: rateColor(d.denialRate) }}>{d.denialRate}%</span></p>
    </div>
  );
}

// ── Custom tooltip for payer bar chart ────────────────────────────────────────

function PayerTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; submitted: number; denied: number; denialRate: number; revenueAtRisk: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
      <p className="text-gray-600">Submitted: <span className="font-medium">{d.submitted}</span></p>
      <p className="text-gray-600">Denied: <span className="font-medium text-red-600">{d.denied}</span></p>
      <p className="text-gray-600">Denial Rate: <span className="font-medium" style={{ color: rateColor(d.denialRate) }}>{d.denialRate}%</span></p>
      <p className="text-gray-600">Revenue at Risk: <span className="font-medium text-red-600">{formatCurrency(d.revenueAtRisk)}</span></p>
    </div>
  );
}

// ── Date range helpers ────────────────────────────────────────────────────────

function computeDates(range: RangeKey, customStart: string, customEnd: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  if (range === 'custom') {
    return { startDate: customStart, endDate: customEnd };
  }

  const months = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : 12;
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DenialTrendsDashboard() {
  const router = useRouter();
  const [range, setRange]             = useState<RangeKey>('1m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [data, setData]               = useState<DenialAnalyticsResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { startDate, endDate } = computeDates(range, customStart, customEnd);
    if (range === 'custom' && (!startDate || !endDate)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/denials?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Failed to load analytics');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [range, customStart, customEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const trendUp   = data && data.overallDenialRate > data.previousDenialRate;
  const trendDown = data && data.overallDenialRate < data.previousDenialRate;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Sample data banner */}
      {data?.isSampleData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Displaying sample data. Submit claims to see your real denial trends.
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── SECTION 1: Top Metrics ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1 — Overall Denial Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Overall Denial Rate</p>
          {loading ? <Skeleton h="h-12" /> : (
            <>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold" style={{ color: rateColor(data?.overallDenialRate ?? 0) }}>
                  {data?.overallDenialRate ?? 0}%
                </span>
                {trendUp   && <span className="flex items-center text-xs text-red-600 mb-1"><TrendingUp className="h-4 w-4 mr-0.5" />vs last period</span>}
                {trendDown && <span className="flex items-center text-xs text-green-600 mb-1"><TrendingDown className="h-4 w-4 mr-0.5" />vs last period</span>}
                {!trendUp && !trendDown && data && <span className="flex items-center text-xs text-gray-400 mb-1"><Minus className="h-4 w-4 mr-0.5" />unchanged</span>}
              </div>
              <div className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${rateBgClass(data?.overallDenialRate ?? 0)}`}>
                {(data?.overallDenialRate ?? 0) < 5 ? 'On target' : (data?.overallDenialRate ?? 0) < 10 ? 'Above average' : 'High — action required'}
              </div>
            </>
          )}
        </div>

        {/* Card 2 — Revenue at Risk */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Revenue at Risk</p>
          {loading ? <Skeleton h="h-12" /> : (
            <>
              <div className={`text-3xl font-bold mt-1 ${revenueBgClass(data?.revenueAtRisk ?? 0)}`}>
                {formatCurrency(data?.revenueAtRisk ?? 0)}
              </div>
              <p className="text-xs text-gray-400 mt-2">Denied claims not yet recovered</p>
            </>
          )}
          <DollarSign className="h-8 w-8 text-gray-100 absolute" style={{ position: 'static', marginTop: 4 }} />
        </div>

        {/* Card 3 — Most Denied Payer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Most Denied Payer</p>
          {loading ? <Skeleton h="h-12" /> : data?.mostDeniedPayer ? (
            <>
              <p className="text-xl font-bold text-gray-900 mt-1 leading-tight">{data.mostDeniedPayer.name}</p>
              <p className="text-sm text-red-600 mt-1">{data.mostDeniedPayer.count} denials this period</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-2">No denials this period</p>
          )}
          <Building2 className="h-5 w-5 text-gray-300 mt-1" />
        </div>

        {/* Card 4 — Most Denied Procedure */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Most Denied Procedure</p>
          {loading ? <Skeleton h="h-12" /> : data?.mostDeniedProcedure ? (
            <>
              <p className="text-xl font-bold text-[#5B3FD4] mt-1">{data.mostDeniedProcedure.code}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">{data.mostDeniedProcedure.description}</p>
              <p className="text-sm text-red-600 mt-1">{data.mostDeniedProcedure.count} denials</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-2">No denials this period</p>
          )}
          <Stethoscope className="h-5 w-5 text-gray-300 mt-1" />
        </div>
      </div>

      {/* ── SECTION 2: Date Range Filter ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 mr-1">Date Range:</span>
          {(['1m','3m','6m','12m','custom'] as RangeKey[]).map(r => {
            const labels: Record<RangeKey, string> = {
              '1m': 'This Month', '3m': 'Last 3 Months',
              '6m': 'Last 6 Months', '12m': 'Last 12 Months', 'custom': 'Custom Range',
            };
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={range === r
                  ? { backgroundColor: '#5B3FD4', color: '#fff' }
                  : { backgroundColor: '#F3F4F6', color: '#374151' }
                }
              >
                {labels[r]}
              </button>
            );
          })}
          {range === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Denial Rate Over Time ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Denial Rate Trend</h2>
        {loading ? <Skeleton /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.denialTrend ?? []} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} domain={[0, 'auto']} />
              <Tooltip content={<TrendTooltip />} />
              <ReferenceLine y={5} stroke="#DC2626" strokeDasharray="5 5" label={{ value: 'Target 5%', position: 'right', fontSize: 11, fill: '#DC2626' }} />
              <Line
                type="monotone"
                dataKey="denialRate"
                stroke="#5B3FD4"
                strokeWidth={2.5}
                dot={{ fill: '#5B3FD4', r: 4 }}
                activeDot={{ r: 6 }}
                name="Denial Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── SECTION 4: Denials by Payer ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Denials by Payer</h2>
        {loading ? <Skeleton /> : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(180, (data?.payerBreakdown.length ?? 0) * 48)}>
              <BarChart
                data={data?.payerBreakdown ?? []}
                layout="vertical"
                margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip content={<PayerTooltip />} />
                <Bar dataKey="denied" radius={[0, 4, 4, 0]}>
                  {data?.payerBreakdown.map((entry, i) => (
                    <Cell key={i} fill={rateColor(entry.denialRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Payer table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payer</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Denied</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Denial Rate</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue at Risk</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.payerBreakdown.map((p, i) => {
                    const trend = p.denialRate - p.previousDenialRate;
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-900">{p.name}</td>
                        <td className="py-2.5 px-3 text-right text-gray-600">{p.submitted}</td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-medium">{p.denied}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rateBgClass(p.denialRate)}`}>
                            {p.denialRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">{formatCurrency(p.revenueAtRisk)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {trend > 0.5  && <span className="flex items-center justify-center text-red-500 text-xs"><TrendingUp className="h-3.5 w-3.5 mr-0.5" />+{trend.toFixed(1)}%</span>}
                          {trend < -0.5 && <span className="flex items-center justify-center text-green-600 text-xs"><TrendingDown className="h-3.5 w-3.5 mr-0.5" />{trend.toFixed(1)}%</span>}
                          {Math.abs(trend) <= 0.5 && <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── SECTION 5: Denials by CDT Code ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Top 10 Denied Procedures</h2>
        {loading ? <Skeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CDT Code</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Denied</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Denial Rate</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue at Risk</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Reason</th>
                  <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.cdtBreakdown.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#5B3FD4]">{row.code}</td>
                    <td className="py-2.5 px-3 text-gray-600 max-w-[200px] truncate" title={row.description}>{row.description}</td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-medium">{row.deniedCount}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rateBgClass(row.denialRate)}`}>
                        {row.denialRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{formatCurrency(row.revenueAtRisk)}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs max-w-[160px] truncate" title={row.topDenialReason}>{row.topDenialReason}</td>
                    <td className="py-2.5 px-3">
                      {row.topDenialCode && (
                        <button
                          onClick={() => router.push(`/denial-decoder?search=${encodeURIComponent(row.topDenialCode)}`)}
                          className="flex items-center gap-1 text-xs text-[#5B3FD4] hover:underline whitespace-nowrap"
                        >
                          View {row.topDenialCode} <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTIONS 6 & 7: Reason Donut + Alerts (2-col) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Section 6 — Denials by Reason */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Denials by Reason</h2>
          {loading ? <Skeleton /> : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data?.reasonBreakdown ?? []}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {data?.reasonBreakdown.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} claims`, name]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1.5 px-2 font-semibold text-gray-500">Category</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-500">Count</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-500">%</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-gray-500">Overturn</th>
                      <th className="text-center py-1.5 px-2 font-semibold text-gray-500">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.reasonBreakdown.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 px-2 font-medium text-gray-900">{r.category}</td>
                        <td className="py-1.5 px-2 text-right text-gray-600">{r.count}</td>
                        <td className="py-1.5 px-2 text-right text-gray-600">{r.percentage}%</td>
                        <td className="py-1.5 px-2 text-right text-gray-600">{r.avgOverturnRate}</td>
                        <td className="py-1.5 px-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            r.priority === 'Fatal' ? 'bg-red-100 text-red-700' :
                            r.priority === 'High'  ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {r.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Section 7 — Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Denial Alerts</h2>
          {loading ? <Skeleton /> : !data?.alerts.length ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <AlertCircle className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No alerts for this period</p>
              <p className="text-xs mt-1">Your denial metrics look good!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.alerts.map((alert, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4 flex gap-3"
                  style={{
                    backgroundColor: alert.type === 'red' ? '#FEF2F2' : '#FFFBEB',
                    borderLeft: `4px solid ${alert.type === 'red' ? '#DC2626' : '#D97706'}`,
                  }}
                >
                  {alert.type === 'red'
                    ? <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  }
                  <p className="text-xs leading-relaxed" style={{ color: alert.type === 'red' ? '#991B1B' : '#92400E' }}>
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 8: Provider Breakdown ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Provider Breakdown</h2>
        {loading ? <Skeleton /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Provider</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Denied</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Denial Rate</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Denial Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.providerBreakdown.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-900">{p.providerName}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">{p.submitted}</td>
                      <td className="py-2.5 px-3 text-right text-red-600 font-medium">{p.denied}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rateBgClass(p.denialRate)}`}>
                          {p.denialRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">{p.topDenialReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3 italic">
              High denial rates for a specific provider may indicate documentation or credentialing issues.
            </p>
          </>
        )}
      </div>

    </div>
  );
}
