'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import DenialRiskBadge from '@/components/claims/DenialRiskBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Brain } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Claim {
  id: string;
  patientName: string;
  payerName: string;
  cdtCodes: string[];
  totalAmount: number;
  serviceDate: string;
  status: string;
  denialRiskScore?: number;
  riskLevel?: string;
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  useEffect(() => {
    fetchClaims();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, riskFilter]);

  async function fetchClaims() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (riskFilter !== 'ALL') params.set('riskLevel', riskFilter);
    const res = await fetch('/api/claims?' + params.toString());
    const data = await res.json();
    setClaims(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const filtered = claims.filter(c =>
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.payerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Claims" subtitle="Manage and analyze dental insurance claims" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search patient or payer..."
                className="pl-9 w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="DENIED">Denied</SelectItem>
                <SelectItem value="APPEALING">Appealing</SelectItem>
                <SelectItem value="APPEAL_WON">Appeal Won</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={v => setRiskFilter(v ?? 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Risk Levels</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link href="/claims/new">
            <Button className="bg-[#0F4C81] hover:bg-[#1E6BB8]">
              <Plus className="h-4 w-4 mr-2" />
              New Claim
            </Button>
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CDT Codes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Service Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Risk Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No claims found.{' '}
                    <Link href="/claims/new" className="text-[#0F4C81] hover:underline">
                      Create your first claim
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map(claim => (
                  <tr key={claim.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{claim.patientName}</td>
                    <td className="px-4 py-3 text-gray-600">{claim.payerName}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {claim.cdtCodes.slice(0, 3).map(code => (
                          <span key={code} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                            {code}
                          </span>
                        ))}
                        {claim.cdtCodes.length > 3 && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            +{claim.cdtCodes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(claim.totalAmount)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(claim.serviceDate)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          STATUS_COLORS[claim.status] || STATUS_COLORS.DRAFT
                        )}
                      >
                        {claim.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DenialRiskBadge riskLevel={claim.riskLevel} score={claim.denialRiskScore} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/claims/${claim.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                          </Button>
                        </Link>
                        {!claim.riskLevel && (
                          <Link href={`/claims/${claim.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600">
                              <Brain className="h-3 w-3 mr-1" />
                              Analyze
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
