'use client';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield } from 'lucide-react';

type AuditAction  = 'LOGIN' | 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE';
type AuditOutcome = 'SUCCESS' | 'FAILURE';

interface AuditLogEntry {
  id:        string;
  timestamp: string;
  userEmail: string;
  action:    AuditAction;
  resource:  string;
  outcome:   AuditOutcome;
}

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL',    label: 'All Actions' },
  { value: 'LOGIN',  label: 'Login'       },
  { value: 'VIEW',   label: 'View'        },
  { value: 'CREATE', label: 'Create'      },
  { value: 'UPDATE', label: 'Update'      },
  { value: 'DELETE', label: 'Delete'      },
];

const ACTION_BADGE: Record<AuditAction, string> = {
  LOGIN:  'bg-blue-50 text-blue-700 border border-blue-200',
  VIEW:   'bg-gray-100 text-gray-600 border border-gray-200',
  CREATE: 'bg-green-50 text-green-700 border border-green-200',
  UPDATE: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  DELETE: 'bg-red-50 text-red-700 border border-red-200',
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
  });
}

export default function AuditLogViewer() {
  const [logs,      setLogs]      = useState<AuditLogEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Filter state
  const [emailInput, setEmailInput] = useState('');
  const [action,     setAction]     = useState('ALL');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (emailInput) params.set('userEmail', emailInput);
      if (action !== 'ALL') params.set('action', action);
      if (startDate) params.set('startDate', startDate);
      if (endDate)   params.set('endDate',   endDate);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.status === 403) {
        setError('Access denied. Admin role required.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load audit logs');
      setLogs(await res.json());
    } catch {
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [emailInput, action, startDate, endDate]);

  // Initial load
  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when action or dates change (dropdowns/date pickers are immediate)
  useEffect(() => { fetchLogs(); }, [action, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Email search: debounce so we don't hammer the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 400);
    return () => clearTimeout(t);
  }, [emailInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#5B3FD4]" />
          <CardTitle className="text-base">Audit Log</CardTitle>
        </div>
        <CardDescription className="text-xs text-gray-500">
          HIPAA access log — user actions, resource IDs only. No patient PHI is stored here.
          Maximum 100 most recent records shown.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Date &amp; Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Resource</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs font-mono">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={log.userEmail}>
                        {log.userEmail}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_BADGE[log.action]}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-[180px] truncate" title={log.resource}>
                        {log.resource}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${OUTCOME_BADGE[log.outcome]}`}>
                          {log.outcome}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Showing up to 100 records · Sorted by most recent first
        </p>
      </CardContent>
    </Card>
  );
}
