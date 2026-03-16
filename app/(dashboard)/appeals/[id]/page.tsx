'use client';
import { useState, useEffect, use } from 'react';
import Header from '@/components/layout/Header';
import AppealStatusBadge from '@/components/appeals/AppealStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Copy, Download, RefreshCw, Send, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Appeal {
  id: string;
  letterContent: string;
  status: string;
  generatedAt: string;
  submittedAt?: string;
  amountRecovered?: number;
  resolution?: string;
  claim: {
    id: string;
    patientName: string;
    patientInsuranceId: string;
    payerName: string;
    planType?: string;
    cdtCodes: string[];
    totalAmount: number;
    serviceDate: string;
    denialReason?: string;
    denialCode?: string;
    deniedAt?: string;
  };
}

export default function AppealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [letterContent, setLetterContent] = useState('');
  const [resolutionModal, setResolutionModal] = useState(false);
  const [resolution, setResolution] = useState({ outcome: 'WON', amountRecovered: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAppeal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchAppeal() {
    const res = await fetch(`/api/appeals/${id}`);
    if (res.ok) {
      const data = await res.json();
      setAppeal(data);
      setLetterContent(data.letterContent);
    }
    setLoading(false);
  }

  async function regenerate() {
    setRegenerating(true);
    const res = await fetch(`/api/appeals/${id}/generate`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setLetterContent(data.letterContent);
      setAppeal(prev => prev ? { ...prev, letterContent: data.letterContent } : prev);
    }
    setRegenerating(false);
  }

  async function markSubmitted() {
    const res = await fetch(`/api/appeals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUBMITTED', submittedAt: new Date().toISOString() }),
    });
    if (res.ok) fetchAppeal();
  }

  async function recordResolution() {
    const res = await fetch(`/api/appeals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: resolution.outcome,
        resolution: resolution.outcome === 'WON' ? 'Appeal approved, payment issued' : 'Appeal denied',
        resolvedAt: new Date().toISOString(),
        amountRecovered: resolution.outcome === 'WON' ? parseFloat(resolution.amountRecovered || '0') : 0,
      }),
    });
    if (res.ok) {
      setResolutionModal(false);
      fetchAppeal();
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(letterContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadPDF() {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        `<html><head><title>Appeal Letter - ${appeal?.claim.patientName}</title>` +
        `<style>body{font-family:serif;max-width:700px;margin:40px auto;line-height:1.6;white-space:pre-wrap;font-size:14px;}</style>` +
        `</head><body>${letterContent.replace(/\n/g, '<br/>')}</body></html>`
      );
      printWindow.document.close();
      printWindow.print();
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Appeal Letter" />
        <div className="p-6">
          <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!appeal) {
    return (
      <div>
        <Header title="Appeal Not Found" />
        <div className="p-6">
          <p className="text-gray-500">Appeal not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Appeal Letter" subtitle={appeal.claim.patientName} />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/appeals">
            <Button variant="ghost" size="sm" className="text-gray-500">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Appeals
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Left: Context */}
          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Appeal Status
                  <AppealStatusBadge status={appeal.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient</span>
                  <span className="font-medium">{appeal.claim.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payer</span>
                  <span>{appeal.claim.payerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service Date</span>
                  <span>{formatDate(appeal.claim.serviceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Billed Amount</span>
                  <span className="font-semibold">{formatCurrency(appeal.claim.totalAmount)}</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-gray-500 mb-1">Denial Reason</div>
                  <div className="text-red-700 text-xs">{appeal.claim.denialReason || 'See EOB'}</div>
                  {appeal.claim.denialCode && (
                    <div className="text-gray-400 text-xs mt-0.5">Code: {appeal.claim.denialCode}</div>
                  )}
                </div>
                {appeal.amountRecovered != null && appeal.amountRecovered > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-emerald-600 font-semibold text-sm flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Recovered: {formatCurrency(appeal.amountRecovered)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                className="w-full bg-[#0F4C81] hover:bg-[#1E6BB8]"
                size="sm"
                onClick={regenerate}
                disabled={regenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? 'Regenerating...' : 'Regenerate Letter'}
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={downloadPDF}>
                <Download className="h-4 w-4 mr-2" /> Download / Print
              </Button>
              {appeal.status === 'DRAFT' && (
                <Button variant="outline" size="sm" className="w-full" onClick={markSubmitted}>
                  <Send className="h-4 w-4 mr-2" /> Mark as Submitted
                </Button>
              )}
              {appeal.status === 'SUBMITTED' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => setResolutionModal(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Record Resolution
                </Button>
              )}
            </div>
          </div>

          {/* Right: Letter Editor */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Appeal Letter</h3>
                <span className="text-xs text-gray-400">Generated {formatDate(appeal.generatedAt)}</span>
              </div>
              <textarea
                className="w-full p-5 text-sm text-gray-800 font-mono leading-relaxed resize-none focus:outline-none min-h-[600px]"
                value={letterContent}
                onChange={e => setLetterContent(e.target.value)}
                placeholder="Appeal letter content will appear here after generation..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      <Dialog open={resolutionModal} onOpenChange={setResolutionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Appeal Resolution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select
                value={resolution.outcome}
                onValueChange={(v: string | null) => v && setResolution({ ...resolution, outcome: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WON">Won — Claim Approved</SelectItem>
                  <SelectItem value="LOST">Lost — Claim Still Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {resolution.outcome === 'WON' && (
              <div className="space-y-2">
                <Label>Amount Recovered ($)</Label>
                <Input
                  type="number"
                  value={resolution.amountRecovered}
                  onChange={e => setResolution({ ...resolution, amountRecovered: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionModal(false)}>Cancel</Button>
            <Button onClick={recordResolution} className="bg-[#0F4C81] hover:bg-[#1E6BB8]">
              Save Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
