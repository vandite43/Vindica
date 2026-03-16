'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import AppealStatusBadge from '@/components/appeals/AppealStatusBadge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, TrendingUp } from 'lucide-react';

interface Appeal {
  id: string;
  status: string;
  generatedAt: string;
  submittedAt?: string;
  amountRecovered?: number;
  claim: {
    id: string;
    patientName: string;
    payerName: string;
    cdtCodes: string[];
    totalAmount: number;
    denialReason?: string;
    serviceDate: string;
  };
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/appeals')
      .then(r => r.json())
      .then(data => { setAppeals(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const totalRecovered = appeals.reduce((sum, a) => sum + (a.amountRecovered || 0), 0);
  const submitted = appeals.filter(a => a.status !== 'DRAFT');
  const winRate = submitted.length > 0
    ? (appeals.filter(a => a.status === 'WON').length / submitted.length) * 100
    : 0;

  return (
    <div>
      <Header title="Appeals" subtitle="Track and manage claim appeal letters" />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Appeals</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{appeals.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Win Rate</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{winRate.toFixed(0)}%</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Recovered via Appeals
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalRecovered)}</div>
          </div>
        </div>

        {/* Appeals List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Payer</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Denial Reason</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Generated</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : appeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    No appeals yet.{' '}
                    <Link href="/claims" className="text-[#0F4C81] hover:underline">
                      Go to a denied claim to generate an appeal.
                    </Link>
                  </td>
                </tr>
              ) : (
                appeals.map(appeal => (
                  <tr key={appeal.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{appeal.claim.patientName}</td>
                    <td className="px-5 py-3 text-gray-600">{appeal.claim.payerName}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-48 truncate">{appeal.claim.denialReason || '—'}</td>
                    <td className="px-5 py-3">{formatCurrency(appeal.claim.totalAmount)}</td>
                    <td className="px-5 py-3">
                      <AppealStatusBadge status={appeal.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(appeal.generatedAt)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/appeals/${appeal.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <FileText className="h-3 w-3 mr-1" /> View Letter
                        </Button>
                      </Link>
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
