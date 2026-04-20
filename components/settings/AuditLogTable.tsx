'use client';
import { useCallback, useEffect, useState } from 'react';
import { Download, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AuditAction =
  | 'LOGIN' | 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'UPDATE_USER_ROLE' | 'MONTH_END_CHECKLIST_ITEM'
  | 'PHI_ACCESS' | 'EXPORT' | 'MFA_CHANGE' | 'USER_CREATED' | 'USER_DEACTIVATED';

type AuditOutcome = 'SUCCESS' | 'FAILURE';

interface AuditLogEntry {
  id:        string;
  timestamp: string;
  userEmail: string;
  action:    AuditAction;
  resource:  string;
  outcome:   AuditOutcome;
  ipAddress: string | null;
  userAgent?: string | null;
  details:   string | null;
  practice?: { id: string; name: string } | null;
}

interface PagedResponse {
  logs:       AuditLogEntry[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface AuditLogTableProps {
  apiUrl: string;
  tier:   'practice' | 'system';
}

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL',                    label: 'All Actions'           },
  { value: 'LOGIN',                  label: 'Login'                 },
  { value: 'VIEW',                   label: 'View'                  },
  { value: 'CREATE',                 label: 'Create'                },
  { value: 'UPDATE',                 label: 'Update'                },
  { value: 'DELETE',                 label: 'Delete'                },
  { value: 'UPDATE_USER_ROLE',       label: 'Role Change'           },
  { value: 'USER_CREATED',           label: 'User Created'          },
  { value: 'USER_DEACTIVATED',       label: 'User Deactivated'      },
  { value: 'MFA_CHANGE',             label: 'MFA Change'            },
  { value: 'PHI_ACCESS',             label: 'PHI Access'            },
  { value: 'EXPORT',                 label: 'Export'                },
  { value: 'MONTH_END_CHECKLIST_ITEM', label: 'Month-End Checklist' },
];

const ACTION_BADGE: Record<AuditAction, string> = {
  LOGIN:                    'bg-blue-50 text-blue-700 border border-blue-200',
  VIEW:                     'bg-gray-100 text-gray-600 border border-gray-200',
  CREATE:                   'bg-green-50 text-green-700 border border-green-200',
  UPDATE:                   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  DELETE:                   'bg-red-50 text-red-700 border border-red-200',
  UPDATE_USER_ROLE:         'bg-orange-50 text-orange-700 border border-orange-200',
  MONTH_END_CHECKLIST_ITEM: 'bg-gray-100 text-gray-600 border border-gray-200',
  PHI_ACCESS:               'bg-purple-50 text-purple-700 border border-purple-200',
  EXPORT:                   'bg-teal-50 text-teal-700 border border-teal-200',
  MFA_CHANGE:               'bg-orange-50 text-orange-700 border border-orange-200',
  USER_CREATED:             'bg-green-50 text-green-700 border border-green-200',
  USER_DEACTIVATED:         'bg-red-50 text-red-700 border border-red-200',
};

const OUTCOME_BADGE: Record<AuditOutcome, string> = {
  SUCCESS: 'bg-green-50 text-green-700 border border-green-200',
  FAILURE: 'bg-red-50 text-red-700 border border-red-200',
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });
}

function truncateAgent(ua: string | null | undefined): string {
  if (!ua) return '—';
  // Extract just the browser name from the full UA string
  const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  if (match) return match[0];
  return ua.slice(0, 30) + (ua.length > 30 ? '…' : '');
}

export default function AuditLogTable({ apiUrl, tier }: AuditLogTableProps) {
  const [data,       setData]       = useState<PagedResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [exporting,  setExporting]  = useState(false);

  // Filters
  const [emailInput,  setEmailInput]  = useState('');
  const [action,      setAction]      = useState('ALL');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [filterPracticeId, setFilterPracticeId] = useState('');
  const [page,        setPage]        = useState(1);

  const buildParams = useCallback((overrides?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (emailInput)        p.set('userEmail',  emailInput);
    if (action !== 'ALL')  p.set('action',     action);
    if (startDate)         p.set('startDate',  startDate);
    if (endDate)           p.set('endDate',    endDate);
    if (filterPracticeId && tier === 'system') p.set('practiceId', filterPracticeId);
    p.set('page', String(page));
    if (overrides) Object.entries(overrides).forEach(([k, v]) => p.set(k, v));
    return p;
  }, [emailInput, action, startDate, endDate, filterPracticeId, tier, page]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}?${buildParams().toString()}`);
      if (res.status === 401 || res.status === 403) {
        setError('Access denied.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load');
      setData(await res.json());
    } catch {
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, buildParams]);

  // Initial load and when page changes
  useEffect(() => { fetchLogs(); }, [fetchLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [action, startDate, endDate, filterPracticeId]);

  // Email search debounce
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchLogs(); }, 400);
    return () => clearTimeout(t);
  }, [emailInput]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExport() {
    setExporting(true);
    try {
      const params = buildParams({ format: 'csv', page: '1' });
      const res = await fetch(`${apiUrl}?${params.toString()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = tier === 'system' ? 'system-audit-log.csv' : 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const isSystem = tier === 'system';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by user email…"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/40 focus:border-[#5B3FD4]"
        />
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                     focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/40 focus:border-[#5B3FD4]"
        >
          {ACTION_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                     focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/40 focus:border-[#5B3FD4]"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                     focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/40 focus:border-[#5B3FD4]"
        />
        {isSystem && (
          <input
            type="text"
            placeholder="Filter by practice ID…"
            value={filterPracticeId}
            onChange={e => setFilterPracticeId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#5B3FD4]/40 focus:border-[#5B3FD4]"
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 border-gray-200"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                  Date &amp; Time
                </th>
                {isSystem && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Practice</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Outcome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
                {isSystem && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Browser</th>
                )}
              </tr>
            </thead>
            <tbody>
              {!data?.logs?.length ? (
                <tr>
                  <td colSpan={isSystem ? 8 : 6} className="px-4 py-10 text-center text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                data.logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs font-mono">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    {isSystem && (
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px] truncate"
                          title={log.practice?.name ?? 'System'}>
                        {log.practice?.name ?? (
                          <span className="text-[#5B3FD4] font-medium">System</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={log.userEmail}>
                      {log.userEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_BADGE[log.action]}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-[180px] truncate"
                        title={log.resource}>
                      {log.resource}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${OUTCOME_BADGE[log.outcome]}`}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {log.ipAddress ?? '—'}
                    </td>
                    {isSystem && (
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate"
                          title={log.userAgent ?? ''}>
                        {truncateAgent(log.userAgent)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {((data.page - 1) * 25) + 1}–{Math.min(data.page * 25, data.total)} of {data.total.toLocaleString()} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs font-medium text-gray-600">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {data && data.totalPages <= 1 && data.total > 0 && (
        <p className="text-xs text-gray-400">
          {data.total} record{data.total !== 1 ? 's' : ''} · Sorted by most recent first
        </p>
      )}

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Shield className="h-3 w-3" />
        HIPAA access log — resource IDs only, no patient PHI stored.
      </p>
    </div>
  );
}
