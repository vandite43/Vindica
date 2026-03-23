'use client';

import { useState } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp,
  DollarSign, BarChart2, AlertCircle, Download, Plus, ArrowUpDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const CARC_OPTIONS = [
  { value: 'CO-16',  label: 'CO-16 — Administrative / Missing Info' },
  { value: 'CO-18',  label: 'CO-18 — Duplicate Claim' },
  { value: 'CO-22',  label: 'CO-22 — COB Issue' },
  { value: 'CO-29',  label: 'CO-29 — Timely Filing Expired' },
  { value: 'CO-45',  label: 'CO-45 — Exceeds Fee Schedule' },
  { value: 'CO-50',  label: 'CO-50 — Not Medically Necessary' },
  { value: 'CO-96',  label: 'CO-96 — Non Covered Charge' },
  { value: 'CO-97',  label: 'CO-97 — Bundling' },
  { value: 'CO-119', label: 'CO-119 — Benefit Maximum Reached' },
  { value: 'CO-151', label: 'CO-151 — Frequency Limitation' },
  { value: 'OA-23',  label: 'OA-23 — Prior Authorization Required' },
  { value: 'Other',  label: 'Other' },
];

const PAYER_OPTIONS = [
  'Delta Dental', 'Cigna', 'Aetna', 'MetLife', 'UnitedHealthcare',
  'Guardian', 'Humana', 'BCBS', 'Medicaid', 'Other',
];

const APPEAL_TIME_OPTIONS = [
  { value: '0.5', label: '30 minutes' },
  { value: '1',   label: '1 hour' },
  { value: '2',   label: '2 hours' },
  { value: '3',   label: '3 hours' },
  { value: '4',   label: '4+ hours' },
];

const CARC_RATES: Record<string, number> = {
  'CO-16': 0.78, 'CO-18': 0.60, 'CO-22': 0.65, 'CO-29': 0.05,
  'CO-45': 0.10, 'CO-50': 0.70, 'CO-96': 0.35, 'CO-97': 0.55,
  'CO-119': 0.05, 'CO-151': 0.45, 'OA-23': 0.65, 'Other': 0.44,
};

const PAYER_MULTIPLIERS: Record<string, number> = {
  'Delta Dental': 1.0, 'Cigna': 0.9, 'Aetna': 0.85, 'MetLife': 1.1,
  'UnitedHealthcare': 0.95, 'Guardian': 1.1, 'Humana': 0.9,
  'BCBS': 1.0, 'Medicaid': 0.7, 'Other': 1.0,
};

const PAYER_MULTIPLIER_NOTES: Record<string, string> = {
  'Cigna': 'AI-driven denials — harder to overturn',
  'Aetna': 'Silent downcoding — harder to overturn',
  'MetLife': 'Most straightforward payer',
  'Guardian': 'Generally fair appeal process',
  'Medicaid': 'Very hard to overturn',
};

const PAYER_WINDOWS: Record<string, number> = {
  'Delta Dental': 180, 'Cigna': 180, 'Aetna': 180, 'MetLife': 180,
  'UnitedHealthcare': 150, 'Guardian': 180, 'Humana': 180,
  'BCBS': 180, 'Medicaid': 90, 'Other': 180,
};

const PAYER_INSTRUCTIONS: Record<string, string> = {
  'Delta Dental': 'Submit written appeal within 180 days. Decision typically within 30 days. Second level appeal available within 60 days of first denial.',
  'Cigna': 'Call Cigna provider line BEFORE submitting formal appeal. Many denials resolved by phone. 180 day window (365 days for California providers).',
  'Aetna': 'Request peer-to-peer discussion with dental consultant before formal appeal. Fax request to 1-877-867-8729. 180 day window.',
  'MetLife': 'Written appeals ONLY. No phone or electronic appeals accepted. Decision within 30 days.',
  'UnitedHealthcare': 'Submit Reconsideration FIRST — only one reconsideration allowed. Then formal appeal if denied. Do not skip reconsideration step.',
  'Guardian': 'Standard written appeal. Generally fair appeal process. Decision within 30 days.',
  'Humana': 'Standard written appeal process. 180 day window from denial date.',
  'BCBS': 'Standard written appeal process. 180 day window from denial date.',
  'Medicaid': 'State specific process. Verify your state\'s appeal procedure. Generally 90 day window from denial date.',
  'Other': 'Verify appeal window and process in your payer contract. Request specific plan language requiring authorization for each procedure.',
};

const BENCHMARKS = [
  { value: '33%',    label: 'of denied claims are ever appealed' },
  { value: '65%',    label: 'of denials are never resubmitted' },
  { value: '60–80%', label: 'of denied revenue recovered by consistent appealers' },
  { value: '44%',    label: 'average appeal success rate with strong documentation' },
  { value: '$25–50', label: 'average cost to work one appeal in staff time' },
  { value: '$6.9B',  label: 'annual administrative burden on dental industry' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkRow {
  id: string;
  patient: string;
  payer: string;
  carcCode: string;
  amount: string;
  days: string;
}

interface ROIResult {
  overturn: number;
  recovery: number;
  cost: number;
  netROI: number;
  roiPct: number;
}

// ─── Pure calc ────────────────────────────────────────────────────────────────

function calcROI(amount: number, payerKey: string, carc: string, rate: number, hours: number): ROIResult {
  const base     = CARC_RATES[carc] ?? 0.44;
  const mult     = PAYER_MULTIPLIERS[payerKey] ?? 1.0;
  const overturn = Math.min(base * mult, 0.95);
  const recovery = amount * overturn;
  const cost     = rate * hours;
  const netROI   = recovery - cost;
  const roiPct   = cost > 0 ? (netROI / cost) * 100 : 0;
  return { overturn, recovery, cost, netROI, roiPct };
}

function getRecommendationLabel(carc: string, result: ROIResult): string {
  if (carc === 'CO-29') return 'DO NOT APPEAL';
  if (carc === 'CO-119') return 'WRITE OFF';
  if (result.netROI > 0 && result.overturn > 0.60) return 'APPEAL';
  if (result.netROI > 0 && result.overturn >= 0.30) return 'CONSIDER';
  return 'WRITE OFF';
}

function emptyRow(): BulkRow {
  return {
    id: Math.random().toString(36).slice(2),
    patient: '',
    payer: 'Delta Dental',
    carcCode: 'CO-16',
    amount: '',
    days: '',
  };
}

// ─── Input helpers ────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ROICalculatorClient() {
  const [claimAmount, setClaimAmount]               = useState('');
  const [payer, setPayer]                           = useState('Delta Dental');
  const [carcCode, setCarcCode]                     = useState('CO-16');
  const [cdtCode, setCdtCode]                       = useState('');
  const [daysSinceDenial, setDaysSinceDenial]       = useState('');
  const [staffRate, setStaffRate]                   = useState('22');
  const [appealTime, setAppealTime]                 = useState('1');
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [bulkRows, setBulkRows]                     = useState<BulkRow[]>([emptyRow()]);

  // Derived values (live)
  const amount  = parseFloat(claimAmount.replace(/,/g, '')) || 0;
  const rate    = parseFloat(staffRate) || 22;
  const hours   = parseFloat(appealTime) || 1;
  const hasAmount = amount > 0;
  const result  = calcROI(amount, payer, carcCode, rate, hours);

  const days    = parseInt(daysSinceDenial) || 0;
  const window  = PAYER_WINDOWS[payer] ?? 180;
  const daysRemaining = window - days;
  const hasDays = daysSinceDenial.trim() !== '';

  // ── Metric card color helpers ──────────────────────────────────────────────

  function overturnColor(v: number) {
    if (v >= 0.60) return 'text-emerald-600';
    if (v >= 0.30) return 'text-amber-500';
    return 'text-red-600';
  }
  function netROIColor(v: number) {
    return v >= 0 ? 'text-emerald-600' : 'text-red-600';
  }
  function roiPctColor(v: number) {
    if (v >= 100) return 'text-emerald-600';
    if (v >= 0)   return 'text-amber-500';
    return 'text-red-600';
  }

  // ── Recommendation logic ───────────────────────────────────────────────────

  type BannerVariant = {
    bg: string; border: string; icon: React.ReactNode;
    heading: string; message: string;
  };

  function getBanner(): BannerVariant {
    if (carcCode === 'CO-29') return {
      bg: 'bg-red-50', border: 'border-red-500',
      icon: <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />,
      heading: 'DO NOT APPEAL',
      message: 'Timely filing denials are permanent revenue loss. CO-29 is non-appealable in almost all circumstances. Write off this claim and audit your submission timeline process.',
    };
    if (carcCode === 'CO-119') return {
      bg: 'bg-gray-50', border: 'border-gray-400',
      icon: <XCircle className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />,
      heading: 'WRITE OFF',
      message: 'Benefit maximum reached. Bill patient for the remaining balance per your financial agreement.',
    };
    if (result.netROI > 0 && result.overturn > 0.60) return {
      bg: 'bg-emerald-50', border: 'border-emerald-500',
      icon: <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />,
      heading: 'APPEAL RECOMMENDED',
      message: `Expected to recover ${formatCurrency(result.recovery)} after staff costs with a ${(result.overturn * 100).toFixed(0)}% probability of success. This claim is worth appealing.`,
    };
    if (result.netROI > 0 && result.overturn >= 0.30) return {
      bg: 'bg-amber-50', border: 'border-amber-400',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />,
      heading: 'CONSIDER APPEALING',
      message: 'This claim has a moderate chance of success. Appeal if documentation is strong.',
    };
    return {
      bg: 'bg-gray-50', border: 'border-gray-400',
      icon: <XCircle className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />,
      heading: 'WRITE OFF RECOMMENDED',
      message: `Appeal costs exceed expected recovery. Consider writing off this claim and billing the patient if applicable.`,
    };
  }

  // ── Bulk helpers ───────────────────────────────────────────────────────────

  function updateRow(id: string, field: keyof BulkRow, value: string) {
    setBulkRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function sortByROI() {
    setBulkRows(rows => {
      return [...rows].sort((a, b) => {
        const ra = calcROI(parseFloat(a.amount) || 0, a.payer, a.carcCode, rate, hours);
        const rb = calcROI(parseFloat(b.amount) || 0, b.payer, b.carcCode, rate, hours);
        return rb.netROI - ra.netROI;
      });
    });
  }

  function exportCSV() {
    const headers = ['Patient', 'Payer', 'CARC Code', 'Amount', 'Days Since Denial', 'Overturn %', 'Expected Recovery', 'Appeal Cost', 'Net ROI', 'Recommendation'];
    const csvRows = bulkRows.map(row => {
      const amt = parseFloat(row.amount) || 0;
      const r = calcROI(amt, row.payer, row.carcCode, rate, hours);
      const rec = getRecommendationLabel(row.carcCode, r);
      return [
        row.patient, row.payer, row.carcCode, row.amount, row.days,
        `${(r.overturn * 100).toFixed(0)}%`,
        r.recovery.toFixed(2), r.cost.toFixed(2), r.netROI.toFixed(2), rec,
      ].map(v => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'appeal-roi-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Bulk totals ────────────────────────────────────────────────────────────

  const bulkTotals = bulkRows.reduce((acc, row) => {
    const amt = parseFloat(row.amount) || 0;
    const r = calcROI(amt, row.payer, row.carcCode, rate, hours);
    return {
      count: acc.count + 1,
      atRisk: acc.atRisk + amt,
      recovery: acc.recovery + r.recovery,
      cost: acc.cost + r.cost,
      netROI: acc.netROI + r.netROI,
    };
  }, { count: 0, atRisk: 0, recovery: 0, cost: 0, netROI: 0 });

  const banner = getBanner();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* ── Sections 1 + 2: two-column grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* INPUT PANEL */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Claim Details</h2>

          {/* Claim Amount */}
          <div>
            <label className={labelCls}>Claim Amount <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="text"
                value={claimAmount}
                onChange={e => { setClaimAmount(e.target.value); setShowRecommendation(false); }}
                placeholder="0.00"
                className={`${inputCls} pl-7`}
              />
            </div>
          </div>

          {/* Payer */}
          <div>
            <label className={labelCls}>Payer</label>
            <select
              value={payer}
              onChange={e => { setPayer(e.target.value); setShowRecommendation(false); }}
              className={inputCls}
            >
              {PAYER_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {PAYER_MULTIPLIER_NOTES[payer] && (
              <p className="text-xs text-amber-600 mt-1">{PAYER_MULTIPLIER_NOTES[payer]}</p>
            )}
          </div>

          {/* CARC Code */}
          <div>
            <label className={labelCls}>Denial Reason / CARC Code</label>
            <select
              value={carcCode}
              onChange={e => { setCarcCode(e.target.value); setShowRecommendation(false); }}
              className={inputCls}
            >
              {CARC_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* CDT Code */}
          <div>
            <label className={labelCls}>CDT Code <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={cdtCode}
              onChange={e => setCdtCode(e.target.value)}
              placeholder="e.g. D4341"
              className={inputCls}
            />
          </div>

          {/* Days Since Denial */}
          <div>
            <label className={labelCls}>Days Since Denial</label>
            <input
              type="number"
              min="0"
              value={daysSinceDenial}
              onChange={e => setDaysSinceDenial(e.target.value)}
              placeholder="e.g. 14"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Used to calculate appeal deadline urgency</p>
          </div>

          {/* Staff Hourly Rate */}
          <div>
            <label className={labelCls}>Staff Hourly Rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="text"
                value={staffRate}
                onChange={e => setStaffRate(e.target.value)}
                placeholder="22"
                className={`${inputCls} pl-7`}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Billing specialist hourly rate — used to calculate appeal cost</p>
          </div>

          {/* Appeal Time */}
          <div>
            <label className={labelCls}>Estimated Appeal Time</label>
            <select
              value={appealTime}
              onChange={e => setAppealTime(e.target.value)}
              className={inputCls}
            >
              {APPEAL_TIME_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowRecommendation(true)}
            disabled={!hasAmount}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#5B3FD4' }}
          >
            Calculate ROI
          </button>
        </div>

        {/* RESULTS PANEL */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">ROI Analysis</h2>

          {!hasAmount ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <BarChart2 className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Enter a claim amount to see your ROI analysis</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">

              {/* Card 1 — Overturn Probability */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Overturn Probability</p>
                <p className={`text-3xl font-bold ${overturnColor(result.overturn)}`}>
                  {(result.overturn * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Base {(( CARC_RATES[carcCode] ?? 0.44) * 100).toFixed(0)}% × {PAYER_MULTIPLIERS[payer] ?? 1.0}x payer
                </p>
              </div>

              {/* Card 2 — Expected Recovery */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Expected Recovery</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(result.recovery)}</p>
                <p className="text-xs text-gray-400 mt-1">Probability-weighted average</p>
              </div>

              {/* Card 3 — Appeal Cost */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Appeal Cost</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(result.cost)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  ${rate}/hr × {hours}h staff time
                </p>
              </div>

              {/* Card 4 — Net ROI */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Net ROI</p>
                <p className={`text-3xl font-bold ${netROIColor(result.netROI)}`}>
                  {formatCurrency(result.netROI)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Recovery minus staff cost</p>
              </div>

              {/* Card 5 — ROI % (full width) */}
              <div className="col-span-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">ROI Percentage</p>
                <p className={`text-3xl font-bold ${roiPctColor(result.roiPct)}`}>
                  {result.roiPct > 0 ? '+' : ''}{result.roiPct.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Net ROI ÷ appeal cost × 100
                </p>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Recommendation Banner ─────────────────────────────── */}
      {showRecommendation && hasAmount && (
        <div className={`rounded-xl border-l-4 p-5 ${banner.bg} ${banner.border}`}>
          <div className="flex items-start gap-3">
            {banner.icon}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-1">{banner.heading}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{banner.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 4: Deadline Warning ──────────────────────────────────── */}
      {hasDays && (() => {
        if (daysRemaining <= 0) return (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              Appeal window has expired. This claim cannot be appealed.
            </p>
          </div>
        );
        if (daysRemaining < 30) return (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 animate-pulse">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-semibold">
              URGENT: Only {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining to appeal. Act immediately.
            </p>
          </div>
        );
        if (daysRemaining <= 60) return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              <span className="font-semibold">Appeal deadline approaching:</span> {daysRemaining} days remaining. Submit appeal soon.
            </p>
          </div>
        );
        return (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700">
              <span className="font-semibold">Appeal deadline:</span> {daysRemaining} days remaining
            </p>
          </div>
        );
      })()}

      {/* ── Section 5: Payer-Specific Instructions ───────────────────────── */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#E8E4FF' }}>
        <p className="text-xs font-semibold text-[#5B3FD4] mb-1">{payer} — Appeal Instructions</p>
        <p className="text-sm text-gray-700 leading-relaxed">{PAYER_INSTRUCTIONS[payer]}</p>
      </div>

      {/* ── Section 6: Bulk Calculator ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Bulk Appeal Analysis</h2>
            <p className="text-xs text-gray-400 mt-0.5">Analyze multiple denied claims to prioritize your appeal queue</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={sortByROI}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort by ROI
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => setBulkRows(rows => [...rows, emptyRow()])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#5B3FD4' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 pr-3 text-xs font-medium text-gray-500 whitespace-nowrap">Patient</th>
                <th className="text-left pb-2 pr-3 text-xs font-medium text-gray-500 whitespace-nowrap">Payer</th>
                <th className="text-left pb-2 pr-3 text-xs font-medium text-gray-500 whitespace-nowrap">CARC Code</th>
                <th className="text-left pb-2 pr-3 text-xs font-medium text-gray-500 whitespace-nowrap">Amount ($)</th>
                <th className="text-left pb-2 pr-3 text-xs font-medium text-gray-500 whitespace-nowrap">Days</th>
                <th className="text-left pb-2 pr-3 text-xs font-medium text-gray-500 whitespace-nowrap">ROI Score</th>
                <th className="text-left pb-2 text-xs font-medium text-gray-500 whitespace-nowrap">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {bulkRows.map(row => {
                const amt  = parseFloat(row.amount) || 0;
                const r    = calcROI(amt, row.payer, row.carcCode, rate, hours);
                const rec  = getRecommendationLabel(row.carcCode, r);
                const recColor =
                  rec === 'APPEAL'     ? 'text-emerald-600 bg-emerald-50' :
                  rec === 'CONSIDER'   ? 'text-amber-600 bg-amber-50' :
                  rec === 'DO NOT APPEAL' ? 'text-red-600 bg-red-50' :
                  'text-gray-500 bg-gray-100';

                return (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={row.patient}
                        onChange={e => updateRow(row.id, 'patient', e.target.value)}
                        placeholder="Last, First"
                        className="w-32 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#5B3FD4]"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={row.payer}
                        onChange={e => updateRow(row.id, 'payer', e.target.value)}
                        className="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#5B3FD4]"
                      >
                        {PAYER_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={row.carcCode}
                        onChange={e => updateRow(row.id, 'carcCode', e.target.value)}
                        className="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#5B3FD4]"
                      >
                        {CARC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={row.amount}
                        onChange={e => updateRow(row.id, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#5B3FD4]"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={row.days}
                        onChange={e => updateRow(row.id, 'days', e.target.value)}
                        placeholder="0"
                        className="w-16 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#5B3FD4]"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      {amt > 0 ? (
                        <span className={`text-xs font-semibold ${r.netROI >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {r.netROI >= 0 ? '+' : ''}{formatCurrency(r.netROI)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      {amt > 0 ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${recColor}`}>
                          {rec}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals row */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Claims',         value: bulkTotals.count.toString() },
            { label: 'Revenue at Risk',       value: formatCurrency(bulkTotals.atRisk) },
            { label: 'Expected Recovery',     value: formatCurrency(bulkTotals.recovery) },
            { label: 'Total Appeal Cost',     value: formatCurrency(bulkTotals.cost) },
            { label: 'Net Portfolio ROI',     value: formatCurrency(bulkTotals.netROI), highlight: true },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${item.highlight ? (bulkTotals.netROI >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 7: Industry Benchmarks ───────────────────────────────── */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#1A1033' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4" style={{ color: '#8B72E8' }} />
          <h2 className="text-sm font-semibold text-white">Industry Benchmarks</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {BENCHMARKS.map((b, i) => (
            <div key={i} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xl font-bold" style={{ color: '#8B72E8' }}>{b.value}</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{b.label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
