'use client';

import { useState, useMemo } from 'react';
import { differenceInDays, addDays, parseISO, format } from 'date-fns';
import {
  Plus, Minus, Phone, Pencil, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Clock, X, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Payer =
  | 'Delta Dental' | 'Cigna' | 'Aetna' | 'MetLife'
  | 'UnitedHealthcare' | 'Guardian' | 'Humana' | 'BCBS'
  | 'Medicaid' | 'Other';

type ClaimStatus = 'Submitted' | 'Pending' | 'Denied' | 'In Appeal' | 'Resubmitted';

interface CallLog {
  id: string;
  date: string;
  time: string;
  repName: string;
  referenceNumber: string;
  outcome: string;
  expectedResolutionDate?: string;
  notes: string;
}

interface Claim {
  id: string;
  patientName: string;
  payer: Payer;
  cdtCode: string;
  procedureDescription: string;
  claimAmount: number;
  dateOfService: string;
  dateSubmitted: string;
  status: ClaimStatus;
  notes: string;
  callLogs: CallLog[];
}

interface ClaimFormData {
  patientName: string;
  payer: Payer;
  cdtCode: string;
  procedureDescription: string;
  claimAmount: string;
  dateOfService: string;
  dateSubmitted: string;
  status: ClaimStatus;
  notes: string;
}

interface LogFormData {
  date: string;
  time: string;
  repName: string;
  referenceNumber: string;
  outcome: string;
  expectedResolutionDate: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYERS: Payer[] = [
  'Delta Dental', 'Cigna', 'Aetna', 'MetLife',
  'UnitedHealthcare', 'Guardian', 'Humana', 'BCBS', 'Medicaid', 'Other',
];

const STATUSES: ClaimStatus[] = ['Submitted', 'Pending', 'Denied', 'In Appeal', 'Resubmitted'];

const FILING_DAYS: Record<Payer, number> = {
  'Delta Dental': 365, 'Cigna': 90, 'Aetna': 90,
  'MetLife': 365, 'UnitedHealthcare': 180, 'Guardian': 180,
  'Humana': 180, 'BCBS': 365, 'Medicaid': 90, 'Other': 180,
};

const HOLD_TIMES: Record<Payer, string> = {
  'Cigna': '45 min', 'Aetna': '45 min', 'UnitedHealthcare': '45 min',
  'Delta Dental': '30 min', 'Medicaid': '30 min', 'Other': '30 min',
  'Humana': '25 min', 'Guardian': '20 min', 'MetLife': '20 min', 'BCBS': '20 min',
};

const CALL_OUTCOMES = [
  'Claim in process — no action needed',
  'Additional information requested by payer',
  'Claim reprocessing — check back in X days',
  'Denied — initiating appeal',
  'Payment issued — verify ERA',
  'Transferred/Escalated',
  'No answer — leaving callback message',
  'Other',
];

const EMPTY_FORM: ClaimFormData = {
  patientName: '', payer: 'Delta Dental', cdtCode: '',
  procedureDescription: '', claimAmount: '',
  dateOfService: '', dateSubmitted: '',
  status: 'Submitted', notes: '',
};

const EMPTY_LOG: LogFormData = {
  date: format(new Date(), 'yyyy-MM-dd'),
  time: format(new Date(), 'HH:mm'),
  repName: '', referenceNumber: '', outcome: CALL_OUTCOMES[0],
  expectedResolutionDate: '', notes: '',
};

// ─── Sample Claims (demo account only) ────────────────────────────────────────

const SAMPLE_CLAIMS: Claim[] = [
  {
    id: 'c1', patientName: 'Sarah Johnson', payer: 'Delta Dental',
    cdtCode: 'D2750', procedureDescription: 'Crown – Porcelain/Metal',
    claimAmount: 1350, dateOfService: '2025-11-12', dateSubmitted: '2025-11-14',
    status: 'Denied', notes: 'Denied for missing pre-op radiograph. Need to re-appeal with X-rays.', callLogs: [],
  },
  {
    id: 'c2', patientName: 'Marcus Williams', payer: 'MetLife',
    cdtCode: 'D6010', procedureDescription: 'Implant Placement',
    claimAmount: 2200, dateOfService: '2025-11-28', dateSubmitted: '2025-11-30',
    status: 'In Appeal', notes: 'Appeal submitted 2025-12-20. Awaiting review.', callLogs: [],
  },
  {
    id: 'c3', patientName: 'Jennifer Park', payer: 'Aetna',
    cdtCode: 'D4341', procedureDescription: 'SRP – Upper Right Quadrant',
    claimAmount: 480, dateOfService: '2026-01-07', dateSubmitted: '2026-01-08',
    status: 'Submitted', notes: 'Aetna 90-day timely filing window closing soon.', callLogs: [],
  },
  {
    id: 'c4', patientName: 'Robert Chen', payer: 'Cigna',
    cdtCode: 'D7210', procedureDescription: 'Surgical Extraction',
    claimAmount: 620, dateOfService: '2026-01-15', dateSubmitted: '2026-01-16',
    status: 'Pending', notes: 'Cigna 90-day deadline approaching. Follow up immediately.', callLogs: [],
  },
  {
    id: 'c5', patientName: 'Amanda Foster', payer: 'UnitedHealthcare',
    cdtCode: 'D2940', procedureDescription: 'Sedative Filling',
    claimAmount: 890, dateOfService: '2026-02-01', dateSubmitted: '2026-02-03',
    status: 'Submitted', notes: '', callLogs: [],
  },
  {
    id: 'c6', patientName: 'David Torres', payer: 'Guardian',
    cdtCode: 'D2740', procedureDescription: 'Crown – All-Ceramic',
    claimAmount: 1100, dateOfService: '2026-02-07', dateSubmitted: '2026-02-08',
    status: 'Resubmitted', notes: 'Resubmitted after correcting tooth number.', callLogs: [],
  },
  {
    id: 'c7', patientName: 'Lisa Nguyen', payer: 'Humana',
    cdtCode: 'D1110', procedureDescription: 'Prophylaxis',
    claimAmount: 145, dateOfService: '2026-03-03', dateSubmitted: '2026-03-04',
    status: 'Denied', notes: 'Denied – frequency limitation. D1110 within 6 months.', callLogs: [],
  },
  {
    id: 'c8', patientName: 'Thomas Wright', payer: 'BCBS',
    cdtCode: 'D2160', procedureDescription: 'Amalgam – 3 Surfaces',
    claimAmount: 285, dateOfService: '2026-03-08', dateSubmitted: '2026-03-09',
    status: 'Pending', notes: '', callLogs: [],
  },
];

// ─── Computed helpers ─────────────────────────────────────────────────────────

const TODAY = new Date();

function calcDerivedFields(claim: Claim) {
  const dos = parseISO(claim.dateOfService);
  const daysInAR = differenceInDays(TODAY, dos);
  const bucket =
    daysInAR >= 90 ? 'Critical' :
    daysInAR >= 61 ? 'High Priority' :
    daysInAR >= 31 ? 'Follow Up' : 'Monitor';
  const deadline = addDays(dos, FILING_DAYS[claim.payer]);
  const daysUntilDeadline = differenceInDays(deadline, TODAY);
  const agingPts  = daysInAR >= 90 ? 40 : daysInAR >= 61 ? 30 : daysInAR >= 31 ? 20 : 5;
  const amountPts = claim.claimAmount > 1000 ? 25 : claim.claimAmount >= 500 ? 20 : claim.claimAmount >= 200 ? 15 : 5;
  const filingPts = daysUntilDeadline < 30 ? 35 : daysUntilDeadline <= 60 ? 20 : 0;
  const statusPts = claim.status === 'Denied' ? 10 : claim.status === 'In Appeal' ? 5 : 0;
  const priorityScore = Math.min(100, agingPts + amountPts + filingPts + statusPts);
  return { daysInAR, bucket, deadline, daysUntilDeadline, priorityScore };
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  try { return format(parseISO(d), 'MM/dd/yy'); } catch { return d; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BucketBadge({ bucket }: { bucket: string }) {
  const cls = {
    'Critical':     'bg-red-100 text-red-700 animate-pulse',
    'High Priority':'bg-orange-100 text-orange-700',
    'Follow Up':    'bg-blue-100 text-blue-700',
    'Monitor':      'bg-green-100 text-green-700',
  }[bucket] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {bucket}
    </span>
  );
}

function PriorityBadge({ score }: { score: number }) {
  const cls =
    score >= 80 ? 'bg-red-50 text-red-600 border-red-200' :
    score >= 50 ? 'bg-orange-50 text-orange-600 border-orange-200' :
    score >= 25 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  'bg-green-50 text-green-700 border-green-200';
  return (
    <span className={`inline-flex items-center justify-center w-10 h-7 text-xs font-bold rounded border ${cls}`}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const cls = {
    'Submitted':  'bg-blue-50 text-blue-700',
    'Pending':    'bg-gray-100 text-gray-600',
    'Denied':     'bg-red-100 text-red-700',
    'In Appeal':  'bg-purple-100 text-purple-700',
    'Resubmitted':'bg-teal-100 text-teal-700',
  }[status];
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

function DeadlineDays({ days }: { days: number }) {
  if (days < 0) return <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Expired</span>;
  if (days < 30) return <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{days}d</span>;
  if (days <= 60) return <span className="text-xs font-semibold text-orange-500">{days}d</span>;
  return <span className="text-xs font-medium text-green-600">{days}d</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ARQueueClientProps {
  isDemoUser: boolean;
  initialClaims?: Claim[];
}

export default function ARQueueClient({ isDemoUser, initialClaims }: ARQueueClientProps) {
  const [claims, setClaims]                     = useState<Claim[]>(
    initialClaims?.length ? initialClaims : isDemoUser ? SAMPLE_CLAIMS : []
  );
  const [view, setView]                         = useState<'priority' | 'carrier'>('priority');
  const [expandedId, setExpandedId]             = useState<string | null>(null);
  const [logModalId, setLogModalId]             = useState<string | null>(null);
  const [editId, setEditId]                     = useState<string | null>(null);
  const [showAddForm, setShowAddForm]           = useState(false);
  const [showRulesPanel, setShowRulesPanel]     = useState(false);
  const [resolveConfirmId, setResolveConfirmId] = useState<string | null>(null);
  const [filters, setFilters]                   = useState({ search: '', bucket: 'all', payer: 'all', status: 'all', amount: 'all' });
  const [formData, setFormData]                 = useState<ClaimFormData>(EMPTY_FORM);
  const [logFormData, setLogFormData]           = useState<LogFormData>(EMPTY_LOG);

  // ── Derived data ──────────────────────────────────────────────────────────

  const enriched = useMemo(() =>
    claims.map(c => ({ ...c, ...calcDerivedFields(c) }))
      .sort((a, b) => b.priorityScore - a.priorityScore),
    [claims]
  );

  const filtered = useMemo(() => enriched.filter(c => {
    if (filters.search && !c.patientName.toLowerCase().includes(filters.search.toLowerCase()) &&
        !c.payer.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.bucket !== 'all' && c.bucket !== filters.bucket) return false;
    if (filters.payer !== 'all' && c.payer !== filters.payer) return false;
    if (filters.status !== 'all' && c.status !== filters.status) return false;
    if (filters.amount !== 'all') {
      if (filters.amount === 'under200' && c.claimAmount >= 200) return false;
      if (filters.amount === '200-500' && (c.claimAmount < 200 || c.claimAmount >= 500)) return false;
      if (filters.amount === '500-1000' && (c.claimAmount < 500 || c.claimAmount >= 1000)) return false;
      if (filters.amount === 'over1000' && c.claimAmount < 1000) return false;
    }
    return true;
  }), [enriched, filters]);

  // ── Summary metrics (from all claims, not filtered) ───────────────────────

  const totalAR      = claims.reduce((s, c) => s + c.claimAmount, 0);
  const critical90   = enriched.filter(c => c.daysInAR >= 90).length;
  const approaching  = enriched.filter(c => c.daysUntilDeadline >= 0 && c.daysUntilDeadline < 30).length;
  const avgDays      = claims.length ? Math.round(enriched.reduce((s, c) => s + c.daysInAR, 0) / claims.length) : 0;

  // ── Carrier grouped view ──────────────────────────────────────────────────

  const byPayer = useMemo(() => {
    const groups: Record<string, typeof enriched> = {};
    filtered.forEach(c => {
      if (!groups[c.payer]) groups[c.payer] = [];
      groups[c.payer].push(c);
    });
    return Object.entries(groups).sort((a, b) =>
      b[1].reduce((s, c) => s + c.priorityScore, 0) - a[1].reduce((s, c) => s + c.priorityScore, 0)
    );
  }, [filtered]);

  // ── Form handlers ─────────────────────────────────────────────────────────

  const openEdit = (claim: Claim) => {
    setFormData({
      patientName: claim.patientName, payer: claim.payer,
      cdtCode: claim.cdtCode, procedureDescription: claim.procedureDescription,
      claimAmount: String(claim.claimAmount),
      dateOfService: claim.dateOfService, dateSubmitted: claim.dateSubmitted,
      status: claim.status, notes: claim.notes,
    });
    setEditId(claim.id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const base = {
      patientName: formData.patientName, payer: formData.payer,
      cdtCode: formData.cdtCode, procedureDescription: formData.procedureDescription,
      claimAmount: parseFloat(formData.claimAmount) || 0,
      dateOfService: formData.dateOfService, dateSubmitted: formData.dateSubmitted,
      status: formData.status, notes: formData.notes,
    };
    if (editId) {
      setClaims(prev => prev.map(c => c.id === editId ? { ...c, ...base } : c));
      setEditId(null);
    } else {
      setClaims(prev => [...prev, { ...base, id: crypto.randomUUID(), callLogs: [] }]);
    }
    setFormData(EMPTY_FORM);
    setShowAddForm(false);
  };

  const cancelForm = () => {
    setFormData(EMPTY_FORM);
    setEditId(null);
    setShowAddForm(false);
  };

  // ── Log Call handlers ─────────────────────────────────────────────────────

  const openLogModal = (id: string) => {
    setLogFormData({
      ...EMPTY_LOG,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
    });
    setLogModalId(id);
  };

  const saveLog = () => {
    if (!logModalId) return;
    const log: CallLog = {
      id: crypto.randomUUID(),
      date: logFormData.date, time: logFormData.time,
      repName: logFormData.repName, referenceNumber: logFormData.referenceNumber,
      outcome: logFormData.outcome,
      expectedResolutionDate: logFormData.expectedResolutionDate || undefined,
      notes: logFormData.notes,
    };
    setClaims(prev => prev.map(c => c.id === logModalId ? { ...c, callLogs: [...c.callLogs, log] } : c));
    setLogModalId(null);
  };

  // ── Resolve handler ───────────────────────────────────────────────────────

  const resolveClaim = (id: string) => {
    setClaims(prev => prev.filter(c => c.id !== id));
    setResolveConfirmId(null);
    setExpandedId(null);
  };

  // ── Input classes ─────────────────────────────────────────────────────────

  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm border border-gray-200 text-gray-900 bg-white outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10 transition-colors';

  const logModalClaim = logModalId ? claims.find(c => c.id === logModalId) : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">

      {/* ── Section 1: Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Open Claims', value: claims.length, color: 'text-gray-900' },
          { label: 'Total AR Value', value: fmtCurrency(totalAR), color: 'text-gray-900' },
          { label: 'Claims 90+ Days', value: critical90, color: critical90 > 0 ? 'text-red-600' : 'text-gray-900' },
          { label: 'Approaching Filing', value: approaching, color: approaching > 0 ? 'text-orange-600' : 'text-gray-900' },
          { label: 'Avg Days in AR', value: `${avgDays}d`, color: 'text-gray-900' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Section 2: Add Claim Form ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => { setShowAddForm(p => !p); if (showAddForm) cancelForm(); }}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            {showAddForm ? <Minus className="h-4 w-4 text-[#5B3FD4]" /> : <Plus className="h-4 w-4 text-[#5B3FD4]" />}
            {editId ? 'Edit Claim' : 'Add Claim'}
          </span>
          <span className="text-xs text-gray-400">{showAddForm ? 'Click to collapse' : 'Click to expand'}</span>
        </button>

        {showAddForm && (
          <form onSubmit={handleFormSubmit} className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Patient Name</label>
                <input required className={inputCls} value={formData.patientName}
                  onChange={e => setFormData(p => ({ ...p, patientName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payer</label>
                <select className={inputCls} value={formData.payer}
                  onChange={e => setFormData(p => ({ ...p, payer: e.target.value as Payer }))}>
                  {PAYERS.map(py => <option key={py}>{py}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CDT Code</label>
                <input className={inputCls} placeholder="D2740" value={formData.cdtCode}
                  onChange={e => setFormData(p => ({ ...p, cdtCode: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Procedure Description</label>
                <input required className={inputCls} value={formData.procedureDescription}
                  onChange={e => setFormData(p => ({ ...p, procedureDescription: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Claim Amount ($)</label>
                <input required type="number" min="0" step="0.01" className={inputCls} value={formData.claimAmount}
                  onChange={e => setFormData(p => ({ ...p, claimAmount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Claim Status</label>
                <select className={inputCls} value={formData.status}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value as ClaimStatus }))}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date of Service</label>
                <input required type="date" className={inputCls} value={formData.dateOfService}
                  onChange={e => setFormData(p => ({ ...p, dateOfService: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date Submitted</label>
                <input required type="date" className={inputCls} value={formData.dateSubmitted}
                  onChange={e => setFormData(p => ({ ...p, dateSubmitted: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea rows={2} className={inputCls} value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit"
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#5B3FD4] hover:bg-[#4B32B4] transition-colors">
                {editId ? 'Save Changes' : 'Add Claim'}
              </button>
              <button type="button" onClick={cancelForm}
                className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Section 3: Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <input
            type="text" placeholder="Search patient or payer…"
            className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10"
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
          />
          {[
            { key: 'bucket', label: 'Bucket', options: [['all', 'All Buckets'], ['Monitor', 'Monitor'], ['Follow Up', 'Follow Up'], ['High Priority', 'High Priority'], ['Critical', 'Critical']] },
            { key: 'payer', label: 'Payer', options: [['all', 'All Payers'], ...PAYERS.map(p => [p, p])] },
            { key: 'status', label: 'Status', options: [['all', 'All Statuses'], ...STATUSES.map(s => [s, s])] },
            { key: 'amount', label: 'Amount', options: [['all', 'All Amounts'], ['under200', 'Under $200'], ['200-500', '$200–$500'], ['500-1000', '$500–$1,000'], ['over1000', 'Over $1,000']] },
          ].map(f => (
            <select key={f.key}
              className="rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-[#5B3FD4] bg-white text-gray-700"
              value={(filters as Record<string, string>)[f.key]}
              onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}>
              {f.options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* ── Section 4: View Toggle + Queue ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">
            Priority Queue — {filtered.length} claim{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['priority', 'carrier'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v ? 'bg-[#5B3FD4] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {v === 'priority' ? 'Priority View' : 'Carrier Batch'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">No claims in queue</p>
            <p className="text-sm mt-1">
              {claims.length === 0 ? 'Add your first claim using the form above.' : 'No claims match the current filters.'}
            </p>
          </div>
        ) : view === 'priority' ? (

          /* ── Priority Table ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Pri.', 'Patient', 'Payer', 'Procedure', 'Amount', 'Days', 'Bucket', 'Deadline', 'Days Left', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(claim => (
                  <>
                    <tr
                      key={claim.id}
                      onClick={() => setExpandedId(expandedId === claim.id ? null : claim.id)}
                      className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${expandedId === claim.id ? 'bg-[#F0EEFF]' : ''}`}
                    >
                      <td className="px-3 py-3"><PriorityBadge score={claim.priorityScore} /></td>
                      <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{claim.patientName}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{claim.payer}</td>
                      <td className="px-3 py-3 text-gray-600 max-w-[160px] truncate">
                        <span className="font-mono text-xs text-[#5B3FD4] mr-1">{claim.cdtCode}</span>
                        {claim.procedureDescription}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{fmtCurrency(claim.claimAmount)}</td>
                      <td className="px-3 py-3 text-gray-600">{claim.daysInAR}d</td>
                      <td className="px-3 py-3"><BucketBadge bucket={claim.bucket} /></td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(claim.deadline.toISOString())}</td>
                      <td className="px-3 py-3"><DeadlineDays days={claim.daysUntilDeadline} /></td>
                      <td className="px-3 py-3"><StatusBadge status={claim.status} /></td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openLogModal(claim.id)} title="Log Call"
                            className="p-1.5 rounded hover:bg-[#E8E4FF] text-gray-500 hover:text-[#5B3FD4] transition-colors">
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => openEdit(claim)} title="Edit"
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {resolveConfirmId === claim.id ? (
                            <span className="flex items-center gap-1 text-xs">
                              <button onClick={() => resolveClaim(claim.id)}
                                className="px-2 py-1 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700">
                                Resolve
                              </button>
                              <button onClick={() => setResolveConfirmId(null)}
                                className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs">
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button onClick={() => setResolveConfirmId(claim.id)} title="Mark Resolved"
                              className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded call log row */}
                    {expandedId === claim.id && (
                      <tr key={`${claim.id}-expanded`} className="bg-[#F8F7FF]">
                        <td colSpan={11} className="px-5 py-4">
                          {claim.notes && (
                            <p className="text-xs text-gray-600 mb-3 italic">Note: {claim.notes}</p>
                          )}
                          {claim.callLogs.length === 0 ? (
                            <p className="text-xs text-gray-400">No call logs yet.
                              <button onClick={() => openLogModal(claim.id)}
                                className="ml-2 text-[#5B3FD4] hover:underline">Log a call</button>
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Call History</p>
                              {claim.callLogs.slice().reverse().map(log => (
                                <div key={log.id} className="flex gap-3 text-xs">
                                  <div className="flex-shrink-0 w-1 bg-[#5B3FD4]/20 rounded-full" />
                                  <div>
                                    <span className="font-medium text-gray-900">{fmtDate(log.date)} {log.time}</span>
                                    {log.repName && <span className="text-gray-500"> · Rep: {log.repName}</span>}
                                    {log.referenceNumber && <span className="text-gray-500"> · Ref: {log.referenceNumber}</span>}
                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-[#E8E4FF] text-[#5B3FD4] font-medium">{log.outcome}</span>
                                    {log.notes && <p className="text-gray-500 mt-0.5">{log.notes}</p>}
                                    {log.expectedResolutionDate && (
                                      <p className="text-amber-600 mt-0.5">Expected resolution: {fmtDate(log.expectedResolutionDate)}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

        ) : (

          /* ── Carrier Batch View ── */
          <div className="divide-y divide-gray-100">
            {byPayer.map(([payer, group]) => {
              const groupTotal = group.reduce((s, c) => s + c.claimAmount, 0);
              return (
                <div key={payer}>
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="font-semibold text-gray-900">{payer}</span>
                    <span className="text-xs text-gray-500">{group.length} claim{group.length !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-medium text-[#5B3FD4]">{fmtCurrency(groupTotal)}</span>
                    <span className="flex items-center gap-1 text-xs text-amber-600 ml-auto">
                      <Clock className="h-3 w-3" />
                      Avg hold: {HOLD_TIMES[payer as Payer] ?? '30 min'}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {group.map(claim => (
                      <div key={claim.id} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <PriorityBadge score={claim.priorityScore} />
                        <span className="font-medium text-gray-900 min-w-[140px]">{claim.patientName}</span>
                        <span className="font-mono text-xs text-[#5B3FD4]">{claim.cdtCode}</span>
                        <span className="text-gray-600 text-sm flex-1 truncate">{claim.procedureDescription}</span>
                        <span className="font-medium text-gray-900">{fmtCurrency(claim.claimAmount)}</span>
                        <BucketBadge bucket={claim.bucket} />
                        <DeadlineDays days={claim.daysUntilDeadline} />
                        <StatusBadge status={claim.status} />
                        <div className="flex items-center gap-1 ml-auto">
                          <button onClick={() => openLogModal(claim.id)} title="Log Call"
                            className="p-1.5 rounded hover:bg-[#E8E4FF] text-gray-500 hover:text-[#5B3FD4] transition-colors">
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => openEdit(claim)} title="Edit"
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 5: AR Rules Panel ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowRulesPanel(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            AR Priority Rules Reference
          </span>
          {showRulesPanel ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showRulesPanel && (
          <div className="px-5 pb-5 border-t border-gray-100 space-y-5 pt-4">
            {/* Priority Hierarchy */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Priority Hierarchy</h3>
              <div className="space-y-2">
                {[
                  { n: 1, rule: 'Timely filing deadline under 30 days', detail: 'Work these FIRST regardless of dollar amount. CO-29 timely filing expired is non-appealable and represents permanent revenue loss.' },
                  { n: 2, rule: '90+ day claims over $500', detail: 'Only 15–25% collectible at this stage. Approaching timely filing windows.' },
                  { n: 3, rule: '61–90 day claims over $500', detail: 'High risk of becoming uncollectable. Prioritize immediately.' },
                  { n: 4, rule: 'Within each bucket, high-dollar first', detail: 'Crowns, bridges, implants, surgery before preventive claims.' },
                  { n: 5, rule: '0–30 day claims', detail: 'Monitor only unless a denial has been received.' },
                ].map(({ n, rule, detail }) => (
                  <div key={n} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E8E4FF] text-[#5B3FD4] text-xs font-bold flex items-center justify-center">{n}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rule}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Golden Rules */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Golden Rules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Never let a rejection sit longer than 24 hours',
                  'Submit claims within 1 business day of treatment',
                  'Only 33% of denied claims are ever appealed — appeal everything appropriate',
                  'Document every follow-up call with date, rep name, and reference number',
                ].map((rule, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#5B3FD4] mt-0.5" />
                    <span className="text-gray-700">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payer Hold Times */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Average Payer Hold Times</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs font-medium text-gray-500">Payer</th>
                      <th className="text-left pb-2 text-xs font-medium text-gray-500">Avg Hold Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(HOLD_TIMES) as [Payer, string][]).map(([payer, time]) => (
                      <tr key={payer} className="border-b border-gray-50">
                        <td className="py-1.5 font-medium text-gray-800">{payer}</td>
                        <td className="py-1.5 text-gray-600">{time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Log Call Modal ── */}
      {logModalId && logModalClaim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setLogModalId(null); }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Log Call</h2>
              <button onClick={() => setLogModalId(null)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Claim summary */}
            <div className="mx-6 mt-4 mb-3 rounded-lg bg-[#E8E4FF] p-3 text-sm">
              <span className="font-semibold text-[#5B3FD4]">{logModalClaim.patientName}</span>
              <span className="text-[#5B3FD4]/70 mx-2">·</span>
              <span className="text-[#5B3FD4]/70">{logModalClaim.payer}</span>
              <span className="text-[#5B3FD4]/70 mx-2">·</span>
              <span className="font-mono text-xs text-[#5B3FD4]">{logModalClaim.cdtCode}</span>
              <span className="text-[#5B3FD4]/70 mx-2">·</span>
              <span className="font-semibold text-[#5B3FD4]">{fmtCurrency(logModalClaim.claimAmount)}</span>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                  <input type="date" className={inputCls} value={logFormData.date}
                    onChange={e => setLogFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                  <input type="time" className={inputCls} value={logFormData.time}
                    onChange={e => setLogFormData(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rep Name</label>
                  <input className={inputCls} placeholder="Insurance rep name" value={logFormData.repName}
                    onChange={e => setLogFormData(p => ({ ...p, repName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Reference Number</label>
                  <input className={inputCls} placeholder="Call reference #" value={logFormData.referenceNumber}
                    onChange={e => setLogFormData(p => ({ ...p, referenceNumber: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Call Outcome</label>
                <select className={inputCls} value={logFormData.outcome}
                  onChange={e => setLogFormData(p => ({ ...p, outcome: e.target.value }))}>
                  {CALL_OUTCOMES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {logFormData.outcome.includes('check back') && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Expected Resolution Date</label>
                  <input type="date" className={inputCls} value={logFormData.expectedResolutionDate}
                    onChange={e => setLogFormData(p => ({ ...p, expectedResolutionDate: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea rows={3} className={inputCls} placeholder="Key details from the call…" value={logFormData.notes}
                  onChange={e => setLogFormData(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <button onClick={saveLog}
                className="w-full py-2.5 rounded-lg bg-[#5B3FD4] text-white text-sm font-semibold hover:bg-[#4B32B4] transition-colors">
                Save Call Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
