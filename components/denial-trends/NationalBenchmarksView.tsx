'use client';

import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DenialByReason {
  reason:       string;
  percentage:   number;
  overturnRate: number;
}

interface DenialByPayerType {
  payerType:  string;
  denialRate: number;
}

interface DenialByProcedureCategory {
  category:   string;
  denialRate: number;
}

interface BenchmarkData {
  overallDenialRate:          number;
  prevQuarterDenialRate:      number;
  appealWinRate:              number;
  avgProcessingDays:          number;
  denialsByReason:            DenialByReason[];
  denialsByPayerType:         DenialByPayerType[];
  denialsByProcedureCategory: DenialByProcedureCategory[];
}

interface LatestBenchmark {
  year:        number;
  quarter:     number;
  source:      string;
  publishedAt: string;
  data:        BenchmarkData;
}

interface TrendPoint {
  label:      string;
  denialRate: number;
}

export interface NationalApiResponse {
  latest: LatestBenchmark | null;
  trend:  TrendPoint[];
}

interface Props {
  data:    NationalApiResponse | null;
  loading: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function overturnBadge(rate: number): string {
  if (rate === 0)  return 'bg-gray-100 text-gray-500';
  if (rate >= 65)  return 'bg-green-50 text-green-700';
  if (rate >= 40)  return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function Skeleton({ h = 'h-64' }: { h?: string }) {
  return <div className={`${h} rounded-xl bg-gray-100 animate-pulse`} />;
}

const DONUT_COLORS = ['#5B3FD4','#3BBFB0','#DC2626','#D97706','#EA580C','#0F4C81','#7C3AED'];

// ── Trend tooltip ─────────────────────────────────────────────────────────────

function NationalTrendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rate = payload[0].value as number;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      <p className="text-gray-600">
        National Denial Rate:{' '}
        <span className="font-medium" style={{ color: rateColor(rate) }}>{rate}%</span>
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NationalBenchmarksView({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} h="h-28" />)}
        </div>
        <Skeleton h="h-72" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton h="h-72" />
          <Skeleton h="h-72" />
        </div>
        <Skeleton h="h-64" />
      </div>
    );
  }

  if (!data?.latest) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No national benchmark data available.
      </div>
    );
  }

  const { latest, trend } = data;
  const d = latest.data;
  const qoqDiff = d.overallDenialRate - d.prevQuarterDenialRate;

  return (
    <div className="space-y-6">

      {/* ── SECTION 1: Top Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Denial Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">National Denial Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-bold" style={{ color: rateColor(d.overallDenialRate) }}>
              {d.overallDenialRate}%
            </span>
            {qoqDiff > 0 && <span className="flex items-center text-xs text-red-600 mb-1"><TrendingUp className="h-4 w-4 mr-0.5" />QoQ</span>}
            {qoqDiff < 0 && <span className="flex items-center text-xs text-green-600 mb-1"><TrendingDown className="h-4 w-4 mr-0.5" />QoQ</span>}
            {qoqDiff === 0 && <span className="flex items-center text-xs text-gray-400 mb-1"><Minus className="h-4 w-4 mr-0.5" />unchanged</span>}
          </div>
          <div className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${rateBgClass(d.overallDenialRate)}`}>
            {d.overallDenialRate < 5 ? 'Industry: On target' : d.overallDenialRate < 10 ? 'Industry: Above avg' : 'Industry: Elevated'}
          </div>
        </div>

        {/* Appeal Win Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Appeal Win Rate</p>
          <div className="text-3xl font-bold text-[#5B3FD4] mt-1">
            {d.appealWinRate}%
          </div>
          <p className="text-xs text-gray-400 mt-2">National average — first-level appeals</p>
        </div>

        {/* Avg Processing Days */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Avg Processing Days</p>
          <div className="text-3xl font-bold text-gray-800 mt-1">
            {d.avgProcessingDays}
          </div>
          <p className="text-xs text-gray-400 mt-2">Days from submission to decision</p>
        </div>

        {/* Source & Quarter */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data Period</p>
          <div className="text-2xl font-bold text-gray-800 mt-1">
            {latest.year} Q{latest.quarter}
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">{latest.source}</p>
          <p className="text-xs text-gray-300 mt-0.5">Published {formatDate(latest.publishedAt)}</p>
        </div>
      </div>

      {/* ── SECTION 2: Quarterly Denial Rate Trend ────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">National Denial Rate Trend</h3>
        {trend.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No trend data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false}
                     domain={['auto', 'auto']} tickFormatter={v => `${v}%`} />
              <Tooltip content={<NationalTrendTooltip />} />
              <ReferenceLine y={5} stroke="#16A34A" strokeDasharray="4 4"
                             label={{ value: '5% target', fontSize: 10, fill: '#16A34A', position: 'insideTopLeft' }} />
              <Line
                type="monotone" dataKey="denialRate" stroke="#5B3FD4"
                strokeWidth={2} dot={{ r: 4, fill: '#5B3FD4', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── SECTION 3: Payer + Reason ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Denials by Payer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Denial Rate by Payer</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.denialsByPayerType} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="payerType" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, 'Denial Rate']} />
              <Bar dataKey="denialRate" radius={[3, 3, 0, 0]}>
                {d.denialsByPayerType.map((entry, i) => (
                  <Cell key={i} fill={rateColor(entry.denialRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1">
            {d.denialsByPayerType.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-xs text-gray-600 py-0.5">
                <span>{p.payerType}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${rateBgClass(p.denialRate)}`}>
                  {p.denialRate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Denials by Reason */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Denials by Reason</h3>
          <div className="flex justify-center mb-3">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={d.denialsByReason}
                  dataKey="percentage"
                  nameKey="reason"
                  cx="50%" cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={2}
                >
                  {d.denialsByReason.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {d.denialsByReason.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-gray-700 truncate">{r.reason}</span>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-gray-500 w-6 text-right">{r.percentage}%</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${overturnBadge(r.overturnRate)}`}>
                    {r.overturnRate === 0 ? 'Fatal' : `${r.overturnRate}% win`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Denial Rate by Procedure Category ─────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Denial Rate by Procedure Category</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={d.denialsByProcedureCategory}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false}
                   tickFormatter={v => `${v}%`} domain={[0, 45]} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#6B7280' }}
                   tickLine={false} axisLine={false} width={195} />
            <Tooltip formatter={(v) => [`${v}%`, 'Denial Rate']} />
            <Bar dataKey="denialRate" radius={[0, 3, 3, 0]}>
              {d.denialsByProcedureCategory.map((entry, i) => (
                <Cell key={i} fill={rateColor(entry.denialRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Source footnote ───────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 text-center pb-2">
        Source: ADA Health Policy Institute · NADP Annual Dental Benefits Report. Updated quarterly by Vyndico.
      </p>

    </div>
  );
}
