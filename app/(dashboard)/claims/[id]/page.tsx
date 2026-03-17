'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import DenialRiskBadge from '@/components/claims/DenialRiskBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getRiskColor } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Brain, RefreshCw, AlertTriangle, CheckCircle, XCircle, FileText, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import type { ClaimAnalysis, RiskFactor } from '@/types';
import { getStoredModel } from '@/lib/hooks/useAIModel';

interface Claim {
  id: string;
  patientName: string;
  patientDob: string;
  patientInsuranceId: string;
  payerName: string;
  planType?: string;
  serviceDate: string;
  claimDate: string;
  cdtCodes: string[];
  toothNumbers: string[];
  diagnosisCodes: string[];
  totalAmount: number;
  providerNpi?: string | null;
  preAuthNumber?: string | null;
  xraysAttached: boolean;
  perioCharting: boolean;
  preAuthObtained: boolean;
  narrativeIncluded: boolean;
  status: string;
  denialRiskScore?: number;
  riskLevel?: string;
  aiAnalysis?: ClaimAnalysis;
  flaggedIssues: string[];
  suggestedCdtCodes: string[];
  deniedAt?: string;
  denialReason?: string;
  denialCode?: string;
  appeal?: { id: string; status: string } | null;
}

interface DenialModalState {
  open: boolean;
  reason: string;
  code: string;
}

function RiskGauge({ score }: { score: number }) {
  const color = getRiskColor(score);
  // Arc goes from 180° to 0° (left to right across the top semicircle)
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circumference = Math.PI * r; // half circumference
  const offset = circumference * (1 - score / 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg width="140" height="80" viewBox="0 0 140 80">
          {/* Background track — full semicircle */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Filled arc — score-proportional */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-3xl font-bold leading-none" style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-1">out of 100</div>
    </div>
  );
}

function RiskFactorItem({ factor }: { factor: RiskFactor }) {
  const [open, setOpen] = useState(false);
  const severityColors = {
    low: 'bg-green-50 text-green-700 border-green-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm font-medium text-gray-800">{factor.factor}</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={cn('px-2 py-0.5 rounded-full text-xs border font-medium capitalize', severityColors[factor.severity])}>
            {factor.severity}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 bg-blue-50 border-t text-sm text-blue-800">
          <span className="font-medium">Recommendation: </span>
          {factor.recommendation}
        </div>
      )}
    </div>
  );
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [denialModal, setDenialModal] = useState<DenialModalState>({ open: false, reason: '', code: '' });
  const [updating, setUpdating] = useState(false);
  const selectedModel = getStoredModel();

  useEffect(() => {
    fetchClaim();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchClaim() {
    setLoading(true);
    const res = await fetch(`/api/claims/${id}`);
    if (res.ok) {
      const data = await res.json();
      setClaim(data);
    }
    setLoading(false);
  }

  async function runAnalysis() {
    setAnalyzing(true);
    const res = await fetch(`/api/claims/${id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedModel }),
    });
    if (res.ok) {
      const data = await res.json();
      setClaim(prev => prev ? { ...prev, ...data.claim, aiAnalysis: data.analysis } : null);
    }
    setAnalyzing(false);
  }

  async function markSubmitted() {
    setUpdating(true);
    const res = await fetch(`/api/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUBMITTED', submittedAt: new Date().toISOString() }),
    });
    if (res.ok) await fetchClaim();
    setUpdating(false);
  }

  async function recordDenial() {
    setUpdating(true);
    const res = await fetch(`/api/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'DENIED',
        deniedAt: new Date().toISOString(),
        denialReason: denialModal.reason,
        denialCode: denialModal.code,
      }),
    });
    if (res.ok) {
      setDenialModal({ open: false, reason: '', code: '' });
      await fetchClaim();
    }
    setUpdating(false);
  }

  async function generateAppeal() {
    setUpdating(true);
    // Create appeal record first
    const appealRes = await fetch('/api/appeals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId: id }),
    });
    if (appealRes.ok) {
      const appeal = await appealRes.json();
      router.push(`/appeals/${appeal.id}`);
    }
    setUpdating(false);
  }

  if (loading) {
    return (
      <div>
        <Header title="Claim Details" />
        <div className="p-6 grid grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!claim) return <div className="p-6 text-gray-500">Claim not found.</div>;

  const analysis = claim.aiAnalysis;

  return (
    <div>
      <Header
        title={`Claim: ${claim.patientName}`}
        subtitle={`${claim.payerName} — ${formatDate(claim.serviceDate)}`}
      />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Claim Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Claim Summary</CardTitle>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[claim.status] || STATUS_COLORS.DRAFT)}>
                  {claim.status.replace('_', ' ')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-500 text-xs">Patient</p>
                  <p className="font-medium">{claim.patientName}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">DOB</p>
                  <p className="font-medium">{formatDate(claim.patientDob)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Member ID</p>
                  <p className="font-mono text-xs">{claim.patientInsuranceId}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Plan Type</p>
                  <p className="font-medium">{claim.planType || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Payer</p>
                  <p className="font-medium">{claim.payerName}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Amount</p>
                  <p className="font-semibold text-[#0F4C81]">{formatCurrency(claim.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Service Date</p>
                  <p className="font-medium">{formatDate(claim.serviceDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Claim Date</p>
                  <p className="font-medium">{formatDate(claim.claimDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">CDT Codes</p>
                <div className="flex gap-1 flex-wrap">
                  {claim.cdtCodes.map(code => (
                    <span key={code} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
              {claim.toothNumbers?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Tooth Numbers</p>
                  <div className="flex gap-1 flex-wrap">
                    {claim.toothNumbers.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {claim.diagnosisCodes.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Diagnosis Codes</p>
                  <div className="flex gap-1 flex-wrap">
                    {claim.diagnosisCodes.map(code => (
                      <span key={code} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(claim.providerNpi || claim.preAuthNumber) && (
                <div className="grid grid-cols-2 gap-3">
                  {claim.providerNpi && (
                    <div>
                      <p className="text-gray-500 text-xs">Provider NPI</p>
                      <p className="font-mono text-xs">{claim.providerNpi}</p>
                    </div>
                  )}
                  {claim.preAuthNumber && (
                    <div>
                      <p className="text-gray-500 text-xs">Pre-auth #</p>
                      <p className="font-mono text-xs">{claim.preAuthNumber}</p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs mb-1">Documentation</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'X-rays', value: claim.xraysAttached },
                    { label: 'Perio Chart', value: claim.perioCharting },
                    { label: 'Pre-auth', value: claim.preAuthObtained },
                    { label: 'Narrative', value: claim.narrativeIncluded },
                  ].map(({ label, value }) => (
                    <span key={label} className={`px-2 py-0.5 rounded text-xs font-medium ${value ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {value ? '✓' : '✗'} {label}
                    </span>
                  ))}
                </div>
              </div>
              {claim.denialReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-700 mb-1">Denial Reason</p>
                  <p className="text-sm text-red-800">{claim.denialReason}</p>
                  {claim.denialCode && <p className="text-xs text-red-600 mt-1">Code: {claim.denialCode}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {(claim.status === 'DRAFT' || claim.status === 'PENDING') && (
              <Link href={`/claims/${id}/edit`}>
                <Button variant="outline">
                  <Pencil className="h-4 w-4 mr-2" /> Edit Claim
                </Button>
              </Link>
            )}
            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              variant="outline"
              className="text-[#0F4C81] border-[#0F4C81]"
            >
              {analyzing ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Brain className="h-4 w-4 mr-2" /> {claim.aiAnalysis ? 'Re-analyze' : 'Run Analysis'}</>
              )}
            </Button>
            {claim.status === 'DRAFT' || claim.status === 'PENDING' ? (
              <Button onClick={markSubmitted} disabled={updating} variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" /> Mark Submitted
              </Button>
            ) : null}
            {['SUBMITTED', 'APPROVED', 'PENDING'].includes(claim.status) && (
              <Button onClick={() => setDenialModal({ ...denialModal, open: true })} variant="outline" className="text-red-600 border-red-200">
                <XCircle className="h-4 w-4 mr-2" /> Record Denial
              </Button>
            )}
            {claim.status === 'DENIED' && !claim.appeal && (
              <Button onClick={generateAppeal} disabled={updating} className="bg-[#0F4C81] hover:bg-[#1E6BB8]">
                <FileText className="h-4 w-4 mr-2" /> Generate Appeal Letter
              </Button>
            )}
            {claim.appeal && (
              <Link href={`/appeals/${claim.appeal.id}`}>
                <Button variant="outline" className="text-teal-600 border-teal-200">
                  <FileText className="h-4 w-4 mr-2" /> View Appeal
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Right: AI Analysis Panel */}
        <div className="space-y-4">
          {analyzing ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Brain className="h-12 w-12 text-[#0F4C81] mx-auto animate-pulse" />
                <p className="font-medium text-gray-700">Analyzing claim with AI...</p>
                <p className="text-sm text-gray-500">This usually takes 5-10 seconds</p>
              </CardContent>
            </Card>
          ) : !analysis ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Brain className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="font-medium text-gray-500">No AI analysis yet</p>
                <Button onClick={runAnalysis} className="bg-[#0F4C81] hover:bg-[#1E6BB8]">
                  <Brain className="h-4 w-4 mr-2" /> Run AI Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Risk Score */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Denial Risk Score</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                  <RiskGauge score={analysis.denialRiskScore} />
                  <div className="space-y-2">
                    <DenialRiskBadge riskLevel={analysis.riskLevel} score={analysis.denialRiskScore} />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{analysis.estimatedCleanClaimProbability}%</span> clean claim probability
                    </p>
                    <p className="text-xs text-gray-500 max-w-xs">{analysis.summary}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Factors */}
              {analysis.riskFactors.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Risk Factors ({analysis.riskFactors.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.riskFactors.map((factor, i) => (
                      <RiskFactorItem key={i} factor={factor} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* CDT Code Review */}
              {analysis.cdtCodeAnalysis.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">CDT Code Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-gray-500 text-xs">
                          <th className="text-left pb-2 pr-6">Code</th>
                          <th className="text-left pb-2 pr-6">Issue</th>
                          <th className="text-left pb-2">Alternative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.cdtCodeAnalysis.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-6 font-mono font-medium">{item.code}</td>
                            <td className="py-2 pr-6 text-gray-600 text-xs">{item.issue}</td>
                            <td className="py-2">
                              {item.alternativeCode ? (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-mono">
                                  {item.alternativeCode}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Missing Documentation */}
              {analysis.missingDocumentation.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Missing Documentation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.missingDocumentation.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
                        <span className="text-gray-700">{doc}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Payer Warnings */}
              {analysis.payerSpecificWarnings.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-amber-700">Payer-Specific Warnings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.payerSpecificWarnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-amber-800">{warning}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recommended Actions */}
              {analysis.recommendedActions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Recommended Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.recommendedActions.map((action, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[#0F4C81] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-gray-700">{action}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Denial Modal */}
      {denialModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Record Denial</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Denial Reason *</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm resize-none h-24"
                  placeholder="Enter the denial reason from the EOB..."
                  value={denialModal.reason}
                  onChange={e => setDenialModal({ ...denialModal, reason: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Denial Code</label>
                <input
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder="e.g., B15, A95"
                  value={denialModal.code}
                  onChange={e => setDenialModal({ ...denialModal, code: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={recordDenial}
                disabled={!denialModal.reason || updating}
                className="bg-red-600 hover:bg-red-700 flex-1"
              >
                Record Denial
              </Button>
              <Button variant="outline" onClick={() => setDenialModal({ open: false, reason: '', code: '' })} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
