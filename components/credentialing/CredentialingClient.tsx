'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
  Plus, Pencil, Clock, User, Building2, FileText,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type CredentialStatus =
  | 'NOT_STARTED' | 'APPLICATION_SENT' | 'IN_PROCESS'
  | 'CREDENTIALED' | 'EXPIRED' | 'TERMINATED' | 'DENIED';

interface CredentialRow {
  id: string;
  payerName: string;
  payerId: string;
  status: CredentialStatus;
  applicationDate?: string | null;
  approvalDate?: string | null;
  expiryDate?: string | null;
  contractType?: string | null;
  providerNumber?: string | null;
  notes?: string | null;
}

interface EventRow {
  id: string;
  payerName?: string | null;
  event: string;
  updatedBy: string;
  notes?: string | null;
  createdAt: string;
}

interface ProviderWithCreds {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string;
  npiType1: string;
  specialty: string;
  active: boolean;
  licenseExpiry: string;
  licenseNumber: string;
  licenseState: string;
  deaNumber?: string | null;
  startDate: string;
  credentialing: CredentialRow[];
  events: EventRow[];
}

interface PracticeInfo {
  id: string;
  name: string;
  npi?: string | null;
  npiType2?: string | null;
  taxId?: string | null;
  address?: string | null;
  billingAddress?: string | null;
  state?: string | null;
}

interface Alert { severity: 'red' | 'yellow'; message: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<CredentialStatus, string> = {
  NOT_STARTED: 'Not Started',
  APPLICATION_SENT: 'Application Sent',
  IN_PROCESS: 'In Process',
  CREDENTIALED: 'Credentialed',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  DENIED: 'Denied',
};

const STATUS_BADGE: Record<CredentialStatus, string> = {
  NOT_STARTED:      'bg-gray-100 text-gray-500',
  APPLICATION_SENT: 'bg-blue-100 text-blue-600',
  IN_PROCESS:       'bg-yellow-100 text-yellow-600',
  CREDENTIALED:     'bg-emerald-100 text-emerald-600',
  EXPIRED:          'bg-red-100 text-red-600',
  TERMINATED:       'bg-red-100 text-red-600',
  DENIED:           'bg-red-100 text-red-600',
};

const ISSUE_STATUSES: CredentialStatus[] = ['EXPIRED', 'TERMINATED', 'DENIED'];
const PAYER_OPTIONS = [
  'Delta Dental', 'Cigna', 'Aetna', 'MetLife', 'UnitedHealthcare',
  'Guardian', 'Humana', 'BCBS', 'Medicaid (State)', 'Medicare Advantage',
];

const CHECKLIST_STEPS = [
  {
    id: 'docs', title: 'Step 1 — Gather Provider Documents',
    items: [
      { id: 'w9',        label: 'Completed W-9' },
      { id: 'license',   label: 'Copy of dental license' },
      { id: 'dea',       label: 'Copy of DEA certificate if applicable' },
      { id: 'mal',       label: 'Malpractice insurance certificate' },
      { id: 'npi_letter',label: 'NPI Type 1 confirmation letter' },
      { id: 'cv',        label: 'CV or work history (last 5 years)' },
      { id: 'diploma',   label: 'Copy of dental school diploma' },
      { id: 'boards',    label: 'Board scores if required' },
      { id: 'id',        label: 'Government issued photo ID' },
    ],
  },
  {
    id: 'submit', title: 'Step 2 — Submit Applications',
    items: [
      { id: 'caqh',       label: 'CAQH ProView profile updated and attested (proview.caqh.org)' },
      { id: 'delta_app',  label: 'Delta Dental application submitted' },
      { id: 'cigna_app',  label: 'Cigna application submitted' },
      { id: 'aetna_app',  label: 'Aetna application submitted' },
      { id: 'metlife_app',label: 'MetLife application submitted' },
      { id: 'uhc_app',    label: 'UHC application submitted' },
      { id: 'guardian_app',label: 'Guardian application submitted' },
      { id: 'medicaid_app',label: 'State Medicaid application submitted if applicable' },
    ],
  },
  {
    id: 'followup', title: 'Step 3 — Follow Up',
    items: [
      { id: 'confirm_recv',  label: 'Confirm applications received by each payer' },
      { id: 'biweekly',      label: 'Follow up every 2 weeks until approved' },
      { id: 'log_calls',     label: 'Log all follow up calls with rep name and reference number' },
    ],
  },
  {
    id: 'confirm', title: 'Step 4 — Confirmation',
    items: [
      { id: 'written_conf',  label: 'Receive written confirmation from each payer' },
      { id: 'eff_date',      label: 'Confirm effective date of credentialing' },
      { id: 'update_Vyndico',label: 'Update provider record in Vyndico' },
      { id: 'no_submit',     label: 'Do not submit claims under this provider until effective date is confirmed' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function providerDisplayName(p: ProviderWithCreds) {
  return `Dr. ${p.firstName} ${p.lastName} ${p.credentials}`;
}

function providerCardStatus(p: ProviderWithCreds): 'green' | 'yellow' | 'red' {
  const creds = p.credentialing;
  if (creds.some(c => ISSUE_STATUSES.includes(c.status))) return 'red';
  const now = new Date();
  if (creds.some(c => c.expiryDate && new Date(c.expiryDate) < now)) return 'red';
  const in90 = new Date(); in90.setDate(now.getDate() + 90);
  if (creds.some(c => c.expiryDate && new Date(c.expiryDate) <= in90)) return 'yellow';
  if (creds.some(c => c.status === 'IN_PROCESS' || c.status === 'APPLICATION_SENT')) return 'yellow';
  if (creds.some(c => c.status === 'NOT_STARTED')) return 'yellow';
  return 'green';
}

function generateAlerts(providers: ProviderWithCreds[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const in90 = new Date(); in90.setDate(now.getDate() + 90);
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(now.getMonth() - 6);

  for (const p of providers.filter(pr => pr.active)) {
    const name = `Dr. ${p.lastName}`;

    // License expiry
    const licExp = new Date(p.licenseExpiry);
    if (licExp < now) {
      alerts.push({ severity: 'red', message: `${name} state license EXPIRED on ${formatDate(p.licenseExpiry)}. Renew immediately — expired license invalidates all credentialing.` });
    } else if (licExp <= in90) {
      const days = Math.ceil((licExp.getTime() - now.getTime()) / 86400000);
      alerts.push({ severity: 'red', message: `${name} state license expires in ${days} days (${formatDate(p.licenseExpiry)}). Renew immediately — expired license invalidates all credentialing.` });
    }

    // Credential issues
    for (const c of p.credentialing) {
      if (c.expiryDate) {
        const exp = new Date(c.expiryDate);
        if (exp < now) {
          alerts.push({ severity: 'red', message: `${name} credentials with ${c.payerName} expired on ${formatDate(c.expiryDate)}. Claims submitted under this provider will be denied out of network.` });
        } else if (exp <= in90) {
          const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
          alerts.push({ severity: 'yellow', message: `${name} credentials with ${c.payerName} expire in ${days} days. Begin renewal process.` });
        }
      }
      if (c.status === 'NOT_STARTED') {
        alerts.push({ severity: 'yellow', message: `${name} has not started credentialing with ${c.payerName}. Any claims submitted to ${c.payerName} will be denied.` });
      }
    }

    // New provider gap
    if (new Date(p.startDate) >= sixMonthsAgo) {
      const notStarted = p.credentialing.filter(c => c.status === 'NOT_STARTED').map(c => c.payerName);
      if (notStarted.length) {
        alerts.push({
          severity: 'red',
          message: `${name} joined on ${formatDate(p.startDate)} and is not yet credentialed with ${notStarted.length} payer${notStarted.length > 1 ? 's' : ''}. Do not submit claims to: ${notStarted.join(', ')}.`,
        });
      }
    }
  }

  return alerts.sort((a, b) => (a.severity === 'red' && b.severity !== 'red' ? -1 : 1));
}

function inputCls(extra = '') {
  return `w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10 transition-colors ${extra}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CredentialingClient() {
  const [providers, setProviders]             = useState<ProviderWithCreds[]>([]);
  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [activeTab, setActiveTab]             = useState<'profile' | 'credentials' | 'timeline'>('credentials');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingCredId, setEditingCredId]     = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [practice, setPractice]               = useState<PracticeInfo | null>(null);
  const [checklistOpen, setChecklistOpen]     = useState(false);
  const [checkedItems, setCheckedItems]       = useState<Set<string>>(new Set());
  const [editPractice, setEditPractice]       = useState(false);
  const [practiceForm, setPracticeForm]       = useState<Partial<PracticeInfo>>({});
  const [showLogEvent, setShowLogEvent]       = useState(false);
  const [saving, setSaving]                   = useState(false);

  // Add Provider form state
  const [newProvider, setNewProvider] = useState({
    firstName: '', lastName: '', credentials: 'DDS', npiType1: '', licenseNumber: '',
    licenseState: '', licenseExpiry: '', deaNumber: '', specialty: 'General Dentistry', startDate: '',
  });
  const [npiError, setNpiError] = useState('');

  // Profile edit state
  const [profileForm, setProfileForm] = useState<Partial<ProviderWithCreds>>({});
  const [editProfile, setEditProfile] = useState(false);

  // Credential edit state
  const [credEdit, setCredEdit] = useState<Partial<CredentialRow>>({});

  // Log event state
  const [logEventForm, setLogEventForm] = useState({ payerName: '', event: '', notes: '' });

  // NPI Validator state
  const [npiVal1, setNpiVal1] = useState('');
  const [npiVal2, setNpiVal2] = useState('');
  const [npiResult, setNpiResult] = useState<{ npi1?: string; npi2?: string } | null>(null);

  const selectedProvider = providers.find(p => p.id === selectedId) ?? null;

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
        if (data.length && !selectedId) setSelectedId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadPractice = useCallback(async () => {
    const res = await fetch('/api/practice');
    if (res.ok) {
      const data = await res.json();
      setPractice(data);
      setPracticeForm(data);
    }
  }, []);

  useEffect(() => { loadProviders(); loadPractice(); }, []);

  // ── Add Provider ──────────────────────────────────────────────────────────

  async function handleAddProvider() {
    if (!/^\d{10}$/.test(newProvider.npiType1)) {
      setNpiError('NPI must be exactly 10 digits');
      return;
    }
    setNpiError('');
    setSaving(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      });
      if (res.ok) {
        const created = await res.json();
        setProviders(prev => [...prev, created]);
        setSelectedId(created.id);
        setActiveTab('credentials');
        setShowAddProvider(false);
        setNewProvider({ firstName: '', lastName: '', credentials: 'DDS', npiType1: '', licenseNumber: '', licenseState: '', licenseExpiry: '', deaNumber: '', specialty: 'General Dentistry', startDate: '' });
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Save Profile ──────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/providers/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setProviders(prev => prev.map(p => p.id === selectedId ? updated : p));
        setEditProfile(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Save Credential ───────────────────────────────────────────────────────

  async function handleSaveCredential(credId: string, payerName: string) {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/providers/${selectedId}/credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: credId, payerName, ...credEdit }),
      });
      if (res.ok) {
        // Refresh provider to get updated creds + new event
        const pRes = await fetch(`/api/providers/${selectedId}`);
        if (pRes.ok) {
          const updated = await pRes.json();
          setProviders(prev => prev.map(p => p.id === selectedId ? updated : p));
        }
        setEditingCredId(null);
        setCredEdit({});
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Log Event ─────────────────────────────────────────────────────────────

  async function handleLogEvent() {
    if (!selectedId || !logEventForm.event) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/providers/${selectedId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEventForm),
      });
      if (res.ok) {
        const pRes = await fetch(`/api/providers/${selectedId}`);
        if (pRes.ok) {
          const updated = await pRes.json();
          setProviders(prev => prev.map(p => p.id === selectedId ? updated : p));
        }
        setShowLogEvent(false);
        setLogEventForm({ payerName: '', event: '', notes: '' });
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Save Practice ─────────────────────────────────────────────────────────

  async function handleSavePractice() {
    setSaving(true);
    try {
      const res = await fetch('/api/practice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(practiceForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setPractice(updated);
        setPracticeForm(updated);
        setEditPractice(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── NPI Validator ─────────────────────────────────────────────────────────

  function validateNPIs() {
    const result: { npi1?: string; npi2?: string } = {};
    if (!npiVal1) {
      result.npi1 = 'NPI is required';
    } else if (!/^\d{10}$/.test(npiVal1)) {
      result.npi1 = 'NPI must be exactly 10 digits';
    } else if (!providers.some(p => p.npiType1 === npiVal1)) {
      result.npi1 = 'This NPI does not match any provider in your system';
    }
    if (npiVal2 && !/^\d{10}$/.test(npiVal2)) {
      result.npi2 = 'NPI must be exactly 10 digits';
    }
    setNpiResult(result);
  }

  const alerts = generateAlerts(providers);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* ── Sections 1+2: Provider List + Detail ─────────────────────── */}
      <div className="grid grid-cols-5 gap-6">

        {/* PROVIDER LIST */}
        <div className="col-span-2 space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Providers</h2>
              <button
                onClick={() => setShowAddProvider(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#5B3FD4' }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Provider
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No providers yet. Add your first provider.</div>
            ) : (
              <div className="space-y-2">
                {providers.map(p => {
                  const status = providerCardStatus(p);
                  const credentialed = p.credentialing.filter(c => c.status === 'CREDENTIALED').length;
                  const total = p.credentialing.length;
                  const pct = total > 0 ? (credentialed / total) * 100 : 0;
                  const isSelected = p.id === selectedId;

                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedId(p.id); setEditProfile(false); setEditingCredId(null); }}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${isSelected ? 'border-[#5B3FD4] bg-[#F0EEFF]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            Dr. {p.firstName} {p.lastName} <span className="text-gray-500 font-normal">{p.credentials}</span>
                          </p>
                          <p className="font-mono text-xs text-gray-400 mt-0.5">NPI: {p.npiType1}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.specialty}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            {p.active ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${status === 'green' ? 'bg-emerald-500' : status === 'yellow' ? 'bg-amber-400' : 'bg-red-500'}`} />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>{credentialed} / {total} payers</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: status === 'green' ? '#3BBFB0' : status === 'yellow' ? '#D97706' : '#DC2626' }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PROVIDER DETAIL */}
        <div className="col-span-3">
          {!selectedProvider ? (
            <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Select a provider to view details</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Provider header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{providerDisplayName(selectedProvider)}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedProvider.specialty} · NPI <span className="font-mono">{selectedProvider.npiType1}</span></p>
                  </div>
                  {!selectedProvider.active && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                  )}
                </div>
                {/* Tabs */}
                <div className="flex gap-4 mt-3 border-b border-gray-100">
                  {(['credentials', 'profile', 'timeline'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-sm pb-2 transition-colors capitalize ${activeTab === tab ? 'border-b-2 border-[#5B3FD4] text-[#5B3FD4] font-semibold' : 'text-gray-400 hover:text-gray-700'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">

                {/* ── TAB: PROFILE ─────────────────────────────────────── */}
                {activeTab === 'profile' && (() => {
                  const p = selectedProvider;
                  const form = editProfile ? profileForm : p;
                  const set = (k: string, v: string) => setProfileForm(prev => ({ ...prev, [k]: v }));
                  const licDays = Math.ceil((new Date(p.licenseExpiry).getTime() - Date.now()) / 86400000);

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        {editProfile ? (
                          <div className="flex gap-2">
                            <button onClick={() => { setEditProfile(false); setProfileForm(p); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500">Cancel</button>
                            <button onClick={handleSaveProfile} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg text-white bg-[#5B3FD4] disabled:opacity-50">Save</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditProfile(true); setProfileForm(p); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'First Name', key: 'firstName', value: form.firstName },
                          { label: 'Last Name', key: 'lastName', value: form.lastName },
                          { label: 'Credentials', key: 'credentials', value: form.credentials },
                          { label: 'Specialty', key: 'specialty', value: form.specialty },
                          { label: 'License Number', key: 'licenseNumber', value: form.licenseNumber },
                          { label: 'License State', key: 'licenseState', value: form.licenseState },
                          { label: 'DEA Number', key: 'deaNumber', value: form.deaNumber ?? '' },
                          { label: 'Start Date', key: 'startDate', value: typeof form.startDate === 'string' ? form.startDate.slice(0,10) : '' },
                        ].map(({ label, key, value }) => (
                          <div key={key}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                            {editProfile
                              ? <input value={value ?? ''} onChange={e => set(key, e.target.value)} className={inputCls()} />
                              : <p className="text-sm text-gray-900 py-1.5">{value || '—'}</p>
                            }
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">NPI Type 1</label>
                          {editProfile
                            ? <input value={profileForm.npiType1 ?? p.npiType1} onChange={e => set('npiType1', e.target.value)} className={inputCls('font-mono')} maxLength={10} />
                            : <p className="text-sm font-mono text-gray-900 py-1.5">{p.npiType1}</p>
                          }
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">License Expiry</label>
                          {editProfile
                            ? <input type="date" value={typeof profileForm.licenseExpiry === 'string' ? profileForm.licenseExpiry.slice(0,10) : ''} onChange={e => set('licenseExpiry', e.target.value)} className={inputCls()} />
                            : (
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-900 py-1.5">{formatDate(p.licenseExpiry)}</p>
                                {licDays <= 90 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                                    {licDays <= 0 ? 'EXPIRED' : `${licDays}d left`}
                                  </span>
                                )}
                              </div>
                            )
                          }
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── TAB: CREDENTIALS ─────────────────────────────────── */}
                {activeTab === 'credentials' && (() => {
                  const creds = selectedProvider.credentialing;
                  const counts = {
                    total: creds.length,
                    credentialed: creds.filter(c => c.status === 'CREDENTIALED').length,
                    inProcess: creds.filter(c => c.status === 'IN_PROCESS' || c.status === 'APPLICATION_SENT').length,
                    notStarted: creds.filter(c => c.status === 'NOT_STARTED').length,
                    issues: creds.filter(c => ISSUE_STATUSES.includes(c.status)).length,
                  };

                  return (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              {['Payer', 'Status', 'App Date', 'Approval', 'Expiry', 'Contract', 'Prov #', ''].map(h => (
                                <th key={h} className="text-left pb-2 pr-2 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {creds.map(c => {
                              const isEditing = editingCredId === c.id;
                              return (
                                <React.Fragment key={c.id}>
                                  <tr className="border-b border-gray-50">
                                    <td className="py-2 pr-2 font-medium text-gray-800 whitespace-nowrap">{c.payerName}</td>
                                    <td className="py-2 pr-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_BADGE[c.status]} ${c.status === 'IN_PROCESS' ? 'animate-pulse' : ''}`}>
                                        {STATUS_LABELS[c.status]}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">{c.applicationDate ? formatDate(c.applicationDate) : '—'}</td>
                                    <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">{c.approvalDate ? formatDate(c.approvalDate) : '—'}</td>
                                    <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">
                                      {c.expiryDate ? (
                                        <span className={new Date(c.expiryDate) < new Date() ? 'text-red-600 font-medium' : ''}>{formatDate(c.expiryDate)}</span>
                                      ) : '—'}
                                    </td>
                                    <td className="py-2 pr-2 text-gray-600">{c.contractType || '—'}</td>
                                    <td className="py-2 pr-2 text-gray-600 font-mono">{c.providerNumber || '—'}</td>
                                    <td className="py-2">
                                      <button
                                        onClick={() => {
                                          if (isEditing) { setEditingCredId(null); setCredEdit({}); }
                                          else { setEditingCredId(c.id); setCredEdit({ status: c.status, applicationDate: c.applicationDate?.slice(0,10) ?? '', approvalDate: c.approvalDate?.slice(0,10) ?? '', expiryDate: c.expiryDate?.slice(0,10) ?? '', contractType: c.contractType ?? '', providerNumber: c.providerNumber ?? '', notes: c.notes ?? '' }); }
                                        }}
                                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 whitespace-nowrap"
                                      >
                                        {isEditing ? 'Close' : 'Edit'}
                                      </button>
                                    </td>
                                  </tr>
                                  {isEditing && (
                                    <tr>
                                      <td colSpan={8} className="pb-3 pt-1">
                                        <div className="bg-[#F0EEFF] rounded-lg p-3 space-y-2">
                                          <div className="grid grid-cols-3 gap-2">
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                                              <select value={credEdit.status ?? c.status} onChange={e => setCredEdit(prev => ({ ...prev, status: e.target.value as CredentialStatus }))} className={inputCls()}>
                                                {(Object.keys(STATUS_LABELS) as CredentialStatus[]).map(s => (
                                                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 mb-1 block">Application Date</label>
                                              <input type="date" value={credEdit.applicationDate ?? ''} onChange={e => setCredEdit(prev => ({ ...prev, applicationDate: e.target.value }))} className={inputCls()} />
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 mb-1 block">Approval Date</label>
                                              <input type="date" value={credEdit.approvalDate ?? ''} onChange={e => setCredEdit(prev => ({ ...prev, approvalDate: e.target.value }))} className={inputCls()} />
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 mb-1 block">Expiry Date</label>
                                              <input type="date" value={credEdit.expiryDate ?? ''} onChange={e => setCredEdit(prev => ({ ...prev, expiryDate: e.target.value }))} className={inputCls()} />
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 mb-1 block">Contract Type</label>
                                              <input value={credEdit.contractType ?? ''} onChange={e => setCredEdit(prev => ({ ...prev, contractType: e.target.value }))} placeholder="PPO, HMO…" className={inputCls()} />
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 mb-1 block">Provider Number</label>
                                              <input value={credEdit.providerNumber ?? ''} onChange={e => setCredEdit(prev => ({ ...prev, providerNumber: e.target.value }))} className={inputCls('font-mono')} />
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                                            <input value={credEdit.notes ?? ''} onChange={e => setCredEdit(prev => ({ ...prev, notes: e.target.value }))} className={inputCls()} />
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <button onClick={() => { setEditingCredId(null); setCredEdit({}); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500">Cancel</button>
                                            <button onClick={() => handleSaveCredential(c.id, c.payerName)} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg text-white bg-[#5B3FD4] disabled:opacity-50">Save</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary counts */}
                      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Total: <strong>{counts.total}</strong></span>
                        <span className="text-xs text-emerald-600">Credentialed: <strong>{counts.credentialed}</strong></span>
                        <span className="text-xs text-amber-600">In Process: <strong>{counts.inProcess}</strong></span>
                        <span className="text-xs text-gray-400">Not Started: <strong>{counts.notStarted}</strong></span>
                        <span className="text-xs text-red-600">Issues: <strong>{counts.issues}</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* ── TAB: TIMELINE ─────────────────────────────────────── */}
                {activeTab === 'timeline' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => setShowLogEvent(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white bg-[#5B3FD4]">
                        <Plus className="h-3.5 w-3.5" /> Log Event
                      </button>
                    </div>
                    {selectedProvider.events.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No events logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedProvider.events.map(ev => (
                          <div key={ev.id} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                            <Clock className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className="text-xs text-gray-400">{formatDate(ev.createdAt)}</span>
                                {ev.payerName && <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8E4FF] text-[#5B3FD4]">{ev.payerName}</span>}
                                <span className="text-xs text-gray-400">by {ev.updatedBy}</span>
                              </div>
                              <p className="text-sm text-gray-800">{ev.event}</p>
                              {ev.notes && <p className="text-xs text-gray-400 mt-0.5">{ev.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Log Event mini-form */}
                    {showLogEvent && (
                      <div className="rounded-lg border border-[#5B3FD4]/20 bg-[#F0EEFF] p-3 space-y-2">
                        <p className="text-xs font-semibold text-[#5B3FD4]">Log Manual Event</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Payer (optional)</label>
                            <select value={logEventForm.payerName} onChange={e => setLogEventForm(p => ({ ...p, payerName: e.target.value }))} className={inputCls()}>
                              <option value="">All Payers</option>
                              {PAYER_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Event Description <span className="text-red-500">*</span></label>
                            <input value={logEventForm.event} onChange={e => setLogEventForm(p => ({ ...p, event: e.target.value }))} placeholder="What happened?" className={inputCls()} />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                          <input value={logEventForm.notes} onChange={e => setLogEventForm(p => ({ ...p, notes: e.target.value }))} className={inputCls()} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowLogEvent(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500">Cancel</button>
                          <button onClick={handleLogEvent} disabled={saving || !logEventForm.event} className="text-xs px-3 py-1.5 rounded-lg text-white bg-[#5B3FD4] disabled:opacity-50">Save Event</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Alerts Panel ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-gray-900">Credentialing Alerts</h2>
          {alerts.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{alerts.length}</span>}
        </div>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" /> All credentialing records are current. No issues detected.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${a.severity === 'red' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-400'}`}>
                {a.severity === 'red'
                  ? <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                <p className={`text-sm leading-relaxed ${a.severity === 'red' ? 'text-red-700' : 'text-amber-700'}`}>{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4: NPI Validator ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-[#5B3FD4]" />
          <h2 className="text-sm font-semibold text-gray-900">NPI Validator</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Box 54 NPI — Type 1 (Individual Dentist)</label>
            <input value={npiVal1} onChange={e => { setNpiVal1(e.target.value); setNpiResult(null); }} placeholder="10-digit NPI" maxLength={10} className={inputCls('font-mono')} />
            {npiResult !== undefined && npiResult !== null && (
              npiResult.npi1
                ? <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> {npiResult.npi1}</p>
                : !npiResult.npi1 && npiVal1 && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Valid — matches a provider in your system</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Box 49 NPI — Type 2 (Organization)</label>
            <input value={npiVal2} onChange={e => { setNpiVal2(e.target.value); setNpiResult(null); }} placeholder="10-digit NPI" maxLength={10} className={inputCls('font-mono')} />
            {npiResult !== undefined && npiResult !== null && npiResult.npi2 && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> {npiResult.npi2}</p>
            )}
            {npiResult !== undefined && npiResult !== null && !npiResult.npi2 && npiVal2 && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Format valid</p>
            )}
          </div>
        </div>
        <button onClick={validateNPIs} className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-[#5B3FD4]">
          Validate NPIs
        </button>
        <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-700">Type 1 NPI</strong> identifies the individual treating dentist — goes in Box 54.{' '}
          <strong className="text-gray-700">Type 2 NPI</strong> identifies the practice or group — goes in Box 49.{' '}
          Submitting the wrong type in the wrong field causes an immediate rejection.
        </div>
      </div>

      {/* ── Section 5: Credentialing Checklist ───────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setChecklistOpen(v => !v)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#5B3FD4]" />
            <span className="text-sm font-semibold text-gray-900">Credentialing Checklist for New Providers</span>
          </div>
          {checklistOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {checklistOpen && (
          <div className="px-5 pb-5 space-y-5">
            {/* Warning */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">⚠ Important</p>
              <p className="text-sm text-red-600 leading-relaxed">
                Do not submit ANY claims under a new provider until you have written confirmation of their effective credentialing date from each payer. Credentialing typically takes 60–120 days. Claims submitted before the effective date will be denied and may not be correctable.
              </p>
            </div>

            {CHECKLIST_STEPS.map(step => (
              <div key={step.id}>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{step.title}</h3>
                <div className="space-y-1.5">
                  {step.items.map(item => (
                    <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checkedItems.has(item.id)}
                        onChange={e => setCheckedItems(prev => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(item.id) : next.delete(item.id);
                          return next;
                        })}
                        className="mt-0.5 accent-[#5B3FD4]"
                      />
                      <span className={`text-sm transition-colors ${checkedItems.has(item.id) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 6: Practice NPI Panel ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#5B3FD4]" />
            <h2 className="text-sm font-semibold text-gray-900">Practice NPI</h2>
          </div>
          {!editPractice
            ? <button onClick={() => setEditPractice(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
            : <div className="flex gap-2">
                <button onClick={() => { setEditPractice(false); setPracticeForm(practice ?? {}); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500">Cancel</button>
                <button onClick={handleSavePractice} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg text-white bg-[#5B3FD4] disabled:opacity-50">Save</button>
              </div>
          }
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Practice Name', key: 'name' },
            { label: 'NPI Type 2 (Organization — Box 49)', key: 'npiType2' },
            { label: 'Tax ID / EIN', key: 'taxId' },
            { label: 'Practice Address', key: 'address' },
            { label: 'Billing Address (if different)', key: 'billingAddress' },
            { label: 'State', key: 'state' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              {editPractice
                ? <input value={(practiceForm as Record<string, string>)[key] ?? ''} onChange={e => setPracticeForm(p => ({ ...p, [key]: e.target.value }))} className={inputCls(key === 'npiType2' ? 'font-mono' : '')} />
                : <p className={`text-sm text-gray-900 py-1 ${key === 'npiType2' ? 'font-mono' : ''}`}>{(practice as Record<string, string> | null)?.[key] || '—'}</p>
              }
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700">
            <strong>NPI Type 2</strong> belongs in Box 49 on every claim. Never use this NPI in Box 54.
          </p>
        </div>
      </div>

      {/* ── Add Provider Modal ────────────────────────────────────────── */}
      <Dialog open={showAddProvider} onOpenChange={setShowAddProvider}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: 'First Name', key: 'firstName', placeholder: 'Jane' },
                { label: 'Last Name', key: 'lastName', placeholder: 'Smith' },
              ] as const).map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label} <span className="text-red-500">*</span></label>
                  <input value={newProvider[key]} onChange={e => setNewProvider(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className={inputCls()} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Credentials</label>
                <select value={newProvider.credentials} onChange={e => setNewProvider(p => ({ ...p, credentials: e.target.value }))} className={inputCls()}>
                  {['DDS', 'DMD', 'RDH', 'DA', 'DO', 'MS'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Specialty</label>
                <select value={newProvider.specialty} onChange={e => setNewProvider(p => ({ ...p, specialty: e.target.value }))} className={inputCls()}>
                  {['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Endodontics', 'Periodontics', 'Prosthodontics', 'Pediatric Dentistry', 'Dental Hygiene'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NPI Type 1 <span className="text-red-500">*</span></label>
              <input value={newProvider.npiType1} onChange={e => { setNewProvider(p => ({ ...p, npiType1: e.target.value })); setNpiError(''); }} placeholder="10-digit individual NPI" maxLength={10} className={inputCls('font-mono')} />
              {npiError && <p className="text-xs text-red-600 mt-1">{npiError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">License Number <span className="text-red-500">*</span></label>
                <input value={newProvider.licenseNumber} onChange={e => setNewProvider(p => ({ ...p, licenseNumber: e.target.value }))} className={inputCls()} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">License State <span className="text-red-500">*</span></label>
                <input value={newProvider.licenseState} onChange={e => setNewProvider(p => ({ ...p, licenseState: e.target.value }))} placeholder="TX" maxLength={2} className={inputCls()} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">License Expiry <span className="text-red-500">*</span></label>
                <input type="date" value={newProvider.licenseExpiry} onChange={e => setNewProvider(p => ({ ...p, licenseExpiry: e.target.value }))} className={inputCls()} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input type="date" value={newProvider.startDate} onChange={e => setNewProvider(p => ({ ...p, startDate: e.target.value }))} className={inputCls()} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">DEA Number (optional)</label>
              <input value={newProvider.deaNumber} onChange={e => setNewProvider(p => ({ ...p, deaNumber: e.target.value }))} className={inputCls()} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddProvider(false)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600">Cancel</button>
              <button
                onClick={handleAddProvider}
                disabled={saving || !newProvider.firstName || !newProvider.lastName || !newProvider.npiType1 || !newProvider.licenseNumber || !newProvider.licenseState || !newProvider.licenseExpiry || !newProvider.startDate}
                className="text-sm px-4 py-2 rounded-lg text-white bg-[#5B3FD4] disabled:opacity-40"
              >
                {saving ? 'Adding…' : 'Add Provider'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
