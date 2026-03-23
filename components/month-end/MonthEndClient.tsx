'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, Circle, Lock, ChevronDown, ChevronRight, CalendarCheck, AlertCircle, AlertTriangle, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ─── Checklist definition ──────────────────────────────────────────────────────

interface ChecklistItem {
  key: string;
  label: string;
}

interface Phase {
  phase: number;
  title: string;
  items: ChecklistItem[];
}

const PHASES: Phase[] = [
  {
    phase: 1,
    title: 'AR Cleanup',
    items: [
      { key: 'ar_aging_report',    label: 'Run and review 30/60/90/120+ day aging report' },
      { key: 'ar_unpaid_claims',   label: 'Work all unpaid claims > 30 days' },
      { key: 'ar_followup_calls',  label: 'Complete payer follow-up calls for denied claims' },
      { key: 'ar_write_offs',      label: 'Post approved write-offs and adjustments' },
      { key: 'ar_patient_balances',label: 'Review and send patient balance statements' },
      { key: 'ar_credits',         label: 'Identify and refund/apply any credit balances' },
      { key: 'ar_secondary',       label: 'Submit all secondary insurance claims' },
    ],
  },
  {
    phase: 2,
    title: 'Unbilled Procedures',
    items: [
      { key: 'unbilled_missing_info', label: 'Clear all "missing info" holds' },
      { key: 'unbilled_walkouts',     label: 'Bill all walk-out procedures from the month' },
      { key: 'unbilled_lab',          label: 'Verify and bill all lab cases' },
      { key: 'unbilled_preauths',     label: 'Confirm pre-auth services were billed' },
      { key: 'unbilled_verify',       label: 'Run unbilled procedure report and confirm $0 balance' },
    ],
  },
  {
    phase: 3,
    title: 'ERA Reconciliation',
    items: [
      { key: 'era_download',      label: 'Download all ERAs for the month' },
      { key: 'era_post',          label: 'Post all unposted ERAs' },
      { key: 'era_match',         label: 'Reconcile ERA payments to claim amounts' },
      { key: 'era_exceptions',    label: 'Work all ERA exceptions/reversals' },
      { key: 'era_paper_eob',     label: 'Post all paper EOBs' },
      { key: 'era_deposit_match', label: 'Match all deposits to payment batches' },
    ],
  },
  {
    phase: 4,
    title: 'Financial Reconciliation',
    items: [
      { key: 'fin_production',      label: 'Reconcile production totals vs billing system' },
      { key: 'fin_collections',     label: 'Reconcile collections to bank deposits' },
      { key: 'fin_adjustments',     label: 'Review and approve all adjustment categories' },
      { key: 'fin_provider_totals', label: 'Run provider production/collection summary' },
      { key: 'fin_insurance_aging', label: 'Confirm insurance aging is accurate post-posting' },
      { key: 'fin_patient_aging',   label: 'Confirm patient aging is accurate' },
    ],
  },
  {
    phase: 5,
    title: 'Reporting',
    items: [
      { key: 'report_monthly_summary', label: 'Generate monthly practice summary report' },
      { key: 'report_provider',        label: 'Run provider productivity report' },
      { key: 'report_payer',           label: 'Run payer mix / collection rate by payer' },
      { key: 'report_denial',          label: 'Export denial analysis report' },
      { key: 'report_kpi',             label: 'Capture KPI snapshot (collection rate, denial rate)' },
      { key: 'report_notes',           label: 'Add month-end notes / narrative' },
      { key: 'report_close',           label: 'Mark month as officially closed' },
    ],
  },
];

const TOTAL_ITEMS = PHASES.reduce((sum, p) => sum + p.items.length, 0);

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MonthEndItem {
  id: string;
  closeId: string;
  phase: number;
  itemKey: string;
  checked: boolean;
  checkedBy: string | null;
  checkedAt: string | null;
}

interface CloseRecord {
  id: string;
  practiceId: string;
  month: number;
  year: number;
  notes: string | null;
  closedAt: string | null;
  items: MonthEndItem[];
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
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
  appealingCount: number;
  oldUnpaidCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCheckedMap(items: MonthEndItem[]): Record<string, MonthEndItem> {
  const map: Record<string, MonthEndItem> = {};
  for (const item of items) map[item.itemKey] = item;
  return map;
}

function phaseCheckedCount(phase: Phase, checkedMap: Record<string, MonthEndItem>): number {
  return phase.items.filter(i => checkedMap[i.key]?.checked).length;
}

function daysRemaining(month: number, year: number): number {
  const lastDay = new Date(year, month, 0);
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((lastDay.getTime() - today.getTime()) / 86400000));
}

function formatCheckedAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function MonthEndClient() {
  const now = new Date();
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year, setYear]             = useState(now.getFullYear());
  const [close, setClose]           = useState<CloseRecord | null>(null);
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState<StatsData | null>(null);
  const [notes, setNotes]           = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [closing, setClosing]       = useState(false);
  const [archiveOpen, setArchiveOpen]   = useState(false);
  const [archive, setArchive]           = useState<CloseRecord[]>([]);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);
  const [openPhases, setOpenPhases]     = useState<Set<number>>(new Set([1]));
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── fetch close record ───────────────────────────────────────────────────────
  const fetchClose = useCallback(async (m: number, y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/month-end?month=${m}&year=${y}`);
      const data: CloseRecord = await res.json();
      setClose(data);
      setNotes(data.notes ?? '');
      // auto-open the first incomplete phase
      const checkedMap = getCheckedMap(data.items);
      for (const p of PHASES) {
        if (phaseCheckedCount(p, checkedMap) < p.items.length) {
          setOpenPhases(new Set([p.phase]));
          break;
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (m: number, y: number) => {
    try {
      const res = await fetch(`/api/practice/stats?month=${m}&year=${y}`);
      const data = await res.json();
      setStats(data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchClose(month, year);
    fetchStats(month, year);
  }, [month, year, fetchClose, fetchStats]);

  // ── toggle checklist item ────────────────────────────────────────────────────
  async function toggleItem(phase: number, itemKey: string, current: boolean) {
    if (!close || close.closedAt) return;
    setSavingItem(itemKey);

    // optimistic update
    const newChecked = !current;
    setClose(prev => {
      if (!prev) return prev;
      const existing = prev.items.find(i => i.itemKey === itemKey);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.itemKey === itemKey
              ? { ...i, checked: newChecked, checkedAt: newChecked ? new Date().toISOString() : null }
              : i
          ),
        };
      }
      return {
        ...prev,
        items: [
          ...prev.items,
          { id: '', closeId: prev.id, phase, itemKey, checked: newChecked, checkedBy: null, checkedAt: newChecked ? new Date().toISOString() : null },
        ],
      };
    });

    try {
      const res = await fetch(`/api/month-end/${close.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, checked: newChecked, phase }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: MonthEndItem = await res.json();
      setClose(prev => prev ? {
        ...prev,
        items: prev.items.some(i => i.itemKey === itemKey)
          ? prev.items.map(i => i.itemKey === itemKey ? updated : i)
          : [...prev.items, updated],
      } : prev);
    } catch {
      // revert
      setClose(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.itemKey === itemKey ? { ...i, checked: current } : i),
      } : prev);
    } finally {
      setSavingItem(null);
    }
  }

  // ── notes auto-save ──────────────────────────────────────────────────────────
  function onNotesChange(val: string) {
    setNotes(val);
    setNotesSaved(false);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      if (!close) return;
      await fetch(`/api/month-end/${close.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: val }),
      });
      setNotesSaved(true);
    }, 800);
  }

  // ── close month ──────────────────────────────────────────────────────────────
  async function closeMonth() {
    if (!close) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/month-end/${close.id}/close`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'Failed to close month');
        return;
      }
      const updated: CloseRecord = await res.json();
      setClose(prev => prev ? { ...prev, closedAt: updated.closedAt } : prev);
    } finally {
      setClosing(false);
    }
  }

  // ── archive ──────────────────────────────────────────────────────────────────
  async function loadArchive() {
    if (archive.length) { setArchiveOpen(o => !o); return; }
    const res = await fetch('/api/month-end?archive=true');
    const data: CloseRecord[] = await res.json();
    setArchive(data);
    setArchiveOpen(true);
  }

  // ── derived state ────────────────────────────────────────────────────────────
  const checkedMap  = close ? getCheckedMap(close.items) : {};
  const totalChecked = Object.values(checkedMap).filter(i => i.checked).length;
  const overallPct  = Math.round((totalChecked / TOTAL_ITEMS) * 100);
  const days        = daysRemaining(month, year);
  const isLocked    = !!close?.closedAt;
  const allDone     = totalChecked >= TOTAL_ITEMS;

  function isPhaseLocked(phaseNum: number): boolean {
    if (phaseNum === 1) return false;
    const prev = PHASES.find(p => p.phase === phaseNum - 1)!;
    return phaseCheckedCount(prev, checkedMap) < prev.items.length;
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* ── Header bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E6F0] p-5 flex flex-wrap items-center gap-4">
        {/* Month/year selectors */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(parseInt(e.target.value))}
            className="border border-[#E8E6F0] rounded-lg px-3 py-1.5 text-sm font-medium text-[#1A1033] focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/30"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="border border-[#E8E6F0] rounded-lg px-3 py-1.5 text-sm font-medium text-[#1A1033] focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/30"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{totalChecked}/{TOTAL_ITEMS} items complete</span>
            <span>{overallPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%`, backgroundColor: '#5B3FD4' }}
            />
          </div>
        </div>

        {/* Days remaining badge */}
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
          days > 7  ? 'bg-emerald-50 text-emerald-600' :
          days >= 3 ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
        }`}>
          {days === 0 ? 'Last day of month' : `${days} day${days !== 1 ? 's' : ''} remaining`}
        </span>

        {/* Close Month button */}
        {isLocked ? (
          <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-semibold border border-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Month Closed {close?.closedAt ? new Date(close.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          </span>
        ) : (
          <button
            onClick={closeMonth}
            disabled={!allDone || closing}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              allDone
                ? 'bg-[#5B3FD4] text-white hover:bg-[#4B2FC4]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Lock className="h-4 w-4 inline mr-1.5" />
            {closing ? 'Closing…' : 'Close Month'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-3 gap-6">

          {/* ── Checklist panel ──────────────────────────────────────────────── */}
          <div className="col-span-2 space-y-4">
            {PHASES.map((p, idx) => {
              const count     = phaseCheckedCount(p, checkedMap);
              const phaseDone = count === p.items.length;
              const locked    = isPhaseLocked(p.phase);
              const open      = openPhases.has(p.phase);

              return (
                <div key={p.phase} className="bg-white rounded-xl border border-[#E8E6F0] overflow-hidden">
                  {/* Phase header */}
                  <button
                    onClick={() => setOpenPhases(prev => {
                      const next = new Set(prev);
                      if (next.has(p.phase)) next.delete(p.phase);
                      else next.add(p.phase);
                      return next;
                    })}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      phaseDone ? 'bg-emerald-100 text-emerald-600' : 'bg-[#E8E4FF] text-[#5B3FD4]'
                    }`}>
                      {phaseDone ? '✓' : p.phase}
                    </span>
                    <span className="flex-1 text-left font-semibold text-[#1A1033] text-sm">
                      Phase {p.phase} — {p.title}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      phaseDone ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {count}/{p.items.length}
                    </span>
                    {locked && <Lock className="h-4 w-4 text-gray-400" />}
                    {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </button>

                  {/* Phase items */}
                  {open && (
                    <div className={`border-t border-[#E8E6F0] divide-y divide-[#F0EEFF] relative ${locked ? 'pointer-events-none' : ''}`}>
                      {locked && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-b-xl">
                          <span className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                            <Lock className="h-4 w-4" />
                            Complete Phase {p.phase - 1} first
                          </span>
                        </div>
                      )}
                      {p.items.map(item => {
                        const dbItem  = checkedMap[item.key];
                        const checked = dbItem?.checked ?? false;
                        const isSaving = savingItem === item.key;

                        return (
                          <div key={item.key} className="flex items-start gap-3 px-5 py-3.5">
                            <button
                              onClick={() => toggleItem(p.phase, item.key, checked)}
                              disabled={isLocked || isSaving}
                              className="flex-shrink-0 mt-0.5"
                            >
                              {checked ? (
                                <CheckCircle2 className="h-5 w-5 text-[#5B3FD4]" />
                              ) : (
                                <Circle className={`h-5 w-5 ${isSaving ? 'text-gray-300 animate-pulse' : 'text-gray-300 hover:text-[#5B3FD4]'} transition-colors`} />
                              )}
                            </button>
                            <div className="flex-1">
                              <p className={`text-sm ${checked ? 'line-through text-gray-400' : 'text-[#1A1033]'}`}>
                                {item.label}
                              </p>
                              {checked && dbItem?.checkedBy && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {dbItem.checkedBy} · {formatCheckedAt(dbItem.checkedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Side panel ───────────────────────────────────────────────────── */}
          <div className="col-span-1 space-y-4">

            {/* KPI panel */}
            <div className="bg-white rounded-xl border border-[#E8E6F0] p-5">
              <h3 className="font-semibold text-[#1A1033] text-sm mb-4 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-[#5B3FD4]" />
                {MONTH_NAMES[month - 1]} {year} KPIs
              </h3>
              {stats ? (
                <div className="space-y-3">
                  <KPIRow
                    label="Total Claims"
                    value={String(stats.totalClaims)}
                  />
                  <KPIRow
                    label="Total Billed"
                    value={formatCurrency(stats.totalBilled)}
                  />
                  <KPIRow
                    label="Collection Rate"
                    value={stats.totalBilled > 0
                      ? `${Math.round((stats.approvedRevenue / stats.totalBilled) * 100)}%`
                      : '—'}
                    benchmark={95}
                    numericVal={stats.totalBilled > 0 ? Math.round((stats.approvedRevenue / stats.totalBilled) * 100) : null}
                    higherIsBetter
                  />
                  <KPIRow
                    label="Denial Rate"
                    value={stats.totalClaims > 0
                      ? `${Math.round((stats.lostAppeals + (stats.totalClaims - stats.totalClaims)) / stats.totalClaims * 100)}%`
                      : '—'}
                  />
                  <KPIRow
                    label="Denied Amount"
                    value={formatCurrency(stats.deniedAmount)}
                    warn={stats.deniedAmount > 5000}
                  />
                  <KPIRow
                    label="Recovered"
                    value={formatCurrency(stats.recoveredRevenue)}
                    good={stats.recoveredRevenue > 0}
                  />
                  <KPIRow
                    label="Appeal Win Rate"
                    value={stats.appealWinRate != null ? `${stats.appealWinRate}%` : '—'}
                    benchmark={50}
                    numericVal={stats.appealWinRate}
                    higherIsBetter
                  />
                  <KPIRow
                    label="Pending Appeals"
                    value={String(stats.appealingCount)}
                    warn={stats.appealingCount > 0}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              )}
            </div>

            {/* Notes panel */}
            <div className="bg-white rounded-xl border border-[#E8E6F0] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#1A1033] text-sm">Close Notes</h3>
                {notesSaved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <Save className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={e => onNotesChange(e.target.value)}
                disabled={isLocked}
                rows={6}
                placeholder="Add notes about this month's close…"
                className="w-full text-sm border border-[#E8E6F0] rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/30 text-[#1A1033] placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {/* Deadline reminders */}
            {stats && (stats.oldUnpaidCount > 0 || stats.appealingCount > 0 || days <= 5) && (
              <div className="bg-white rounded-xl border border-[#E8E6F0] p-5">
                <h3 className="font-semibold text-[#1A1033] text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Reminders
                </h3>
                <div className="space-y-2">
                  {stats.oldUnpaidCount > 0 && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      {stats.oldUnpaidCount} claim{stats.oldUnpaidCount !== 1 ? 's' : ''} unpaid for 30+ days — follow up needed
                    </div>
                  )}
                  {stats.appealingCount > 0 && (
                    <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-2.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      {stats.appealingCount} appeal{stats.appealingCount !== 1 ? 's' : ''} pending resolution
                    </div>
                  )}
                  {days <= 5 && !isLocked && (
                    <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      {days === 0 ? 'Last day of month — complete and close now' : `Only ${days} day${days !== 1 ? 's' : ''} left to complete close`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Archive panel ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E6F0] overflow-hidden">
        <button
          onClick={loadArchive}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-[#1A1033] text-sm">Previous Month Closes</span>
          {archiveOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </button>
        {archiveOpen && (
          <div className="border-t border-[#E8E6F0]">
            {archive.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No closed months yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#E8E6F0]">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Month</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Completion</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Closed At</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EEFF]">
                  {archive.map(rec => {
                    const cm      = getCheckedMap(rec.items);
                    const checked = Object.values(cm).filter(i => i.checked).length;
                    const isExp   = expandedArchive === rec.id;
                    return (
                      <React.Fragment key={rec.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedArchive(isExp ? null : rec.id)}
                        >
                          <td className="px-5 py-3 font-medium text-[#1A1033]">
                            {MONTH_NAMES[rec.month - 1]} {rec.year}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#5B3FD4]"
                                  style={{ width: `${Math.round((checked / TOTAL_ITEMS) * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{checked}/{TOTAL_ITEMS}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {rec.closedAt
                              ? new Date(rec.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : <span className="text-amber-500">Not closed</span>
                            }
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs max-w-xs truncate">
                            {rec.notes ?? '—'}
                          </td>
                        </tr>
                        {isExp && (
                          <tr>
                            <td colSpan={4} className="px-5 py-4 bg-[#F8F7FF]">
                              <div className="grid grid-cols-3 gap-4">
                                {PHASES.map(p => (
                                  <div key={p.phase}>
                                    <p className="text-xs font-semibold text-[#5B3FD4] mb-2">
                                      Phase {p.phase} — {p.title}
                                    </p>
                                    <div className="space-y-1">
                                      {p.items.map(item => {
                                        const itm = cm[item.key];
                                        return (
                                          <div key={item.key} className="flex items-center gap-2 text-xs text-gray-600">
                                            {itm?.checked
                                              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                              : <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                                            }
                                            <span className={itm?.checked ? 'text-gray-400 line-through' : ''}>
                                              {item.label}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Row helper ────────────────────────────────────────────────────────────

function KPIRow({
  label, value, benchmark, numericVal, higherIsBetter, warn, good,
}: {
  label: string;
  value: string;
  benchmark?: number;
  numericVal?: number | null;
  higherIsBetter?: boolean;
  warn?: boolean;
  good?: boolean;
}) {
  let color = 'text-[#1A1033]';
  if (numericVal != null && benchmark != null) {
    const better = higherIsBetter ? numericVal >= benchmark : numericVal <= benchmark;
    color = better ? 'text-emerald-600' : 'text-red-600';
  } else if (warn) {
    color = 'text-amber-600';
  } else if (good) {
    color = 'text-emerald-600';
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}
