'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { ChevronDown, ChevronRight, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Payer {
  id: string;
  name: string;
  state?: string;
  denialRate?: number;
  avgProcessDays?: number;
  commonDenialReasons: string[];
  requiresPreAuth: string[];
  documentationQuirks: string[];
}

export default function PayersPage() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/payers')
      .then(r => r.json())
      .then(data => { setPayers(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  }

  function getDenialRateColor(rate?: number) {
    if (!rate) return 'text-gray-500';
    if (rate < 0.12) return 'text-green-600';
    if (rate < 0.16) return 'text-amber-600';
    return 'text-red-600';
  }

  return (
    <div>
      <Header title="Payer Intelligence" subtitle="AI-aggregated insights for major dental payers" />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-8 px-5 py-3" />
                <th className="text-left px-5 py-3 font-medium text-gray-600">Payer</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Denial Rate</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Avg Process Days</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Top Denial Reasons</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Pre-Auth Required For</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                payers.map(payer => (
                  <tbody key={payer.id}>
                    <tr
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(payer.id)}
                    >
                      <td className="px-5 py-3">
                        {expanded.has(payer.id)
                          ? <ChevronDown className="h-4 w-4 text-gray-400" />
                          : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{payer.name}</td>
                      <td className="px-5 py-3">
                        <span className={cn('font-semibold', getDenialRateColor(payer.denialRate))}>
                          {payer.denialRate ? `${(payer.denialRate * 100).toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {payer.avgProcessDays ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {payer.avgProcessDays} days
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {payer.commonDenialReasons.slice(0, 2).map((reason, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-xs max-w-36 truncate"
                              title={reason}
                            >
                              {reason}
                            </span>
                          ))}
                          {payer.commonDenialReasons.length > 2 && (
                            <span className="text-xs text-gray-400">+{payer.commonDenialReasons.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {payer.requiresPreAuth.slice(0, 3).map(code => (
                            <span key={code} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-mono">
                              {code}
                            </span>
                          ))}
                          {payer.requiresPreAuth.length > 3 && (
                            <span className="text-xs text-gray-400">+{payer.requiresPreAuth.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded.has(payer.id) && (
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td colSpan={6} className="px-12 py-4">
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-xs uppercase tracking-wide">
                                <TrendingDown className="h-3.5 w-3.5" /> All Denial Reasons
                              </h4>
                              <ul className="space-y-1">
                                {payer.commonDenialReasons.map((reason, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                                    <span className="text-red-400 mt-0.5">•</span>{reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-xs uppercase tracking-wide">
                                <AlertTriangle className="h-3.5 w-3.5" /> Pre-Auth Requirements
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {payer.requiresPreAuth.map(code => (
                                  <span
                                    key={code}
                                    className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-mono"
                                  >
                                    {code}
                                  </span>
                                ))}
                                {payer.requiresPreAuth.length === 0 && (
                                  <span className="text-sm text-gray-400">None listed</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wide">
                                Documentation Tips
                              </h4>
                              <ul className="space-y-1">
                                {payer.documentationQuirks.map((quirk, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                                    <span className="text-blue-400 mt-0.5">•</span>{quirk}
                                  </li>
                                ))}
                                {payer.documentationQuirks.length === 0 && (
                                  <li className="text-sm text-gray-400">No quirks noted</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
