'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Brain } from 'lucide-react';
import { PLAN_TYPES, CDT_CODES } from '@/lib/constants';

interface Payer {
  id: string;
  payerId: string;
  name: string;
}

export default function NewClaimPage() {
  const router = useRouter();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(false);
  const [cdtCodes, setCdtCodes] = useState(['']);
  const [toothNumbers, setToothNumbers] = useState(['']);
  const [diagnosisCodes, setDiagnosisCodes] = useState(['']);
  const [docs, setDocs] = useState({ xrays: false, perioChart: false, preAuth: false, narrative: false });
  const [preAuthNumber, setPreAuthNumber] = useState('');
  const [form, setForm] = useState({
    patientName: '',
    patientDob: '',
    patientInsuranceId: '',
    providerNpi: '',
    payerId: '',
    payerName: '',
    planType: 'PPO',
    serviceDate: '',
    claimDate: new Date().toISOString().split('T')[0],
    totalAmount: '',
  });

  useEffect(() => {
    fetch('/api/payers')
      .then(r => r.json())
      .then(setPayers)
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const selectedPayer = payers.find(p => p.payerId === form.payerId);

    const res = await fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        payerName: selectedPayer?.name || form.payerName,
        cdtCodes: cdtCodes.filter(Boolean),
        toothNumbers: toothNumbers.filter(Boolean),
        diagnosisCodes: diagnosisCodes.filter(Boolean),
        providerNpi: form.providerNpi || undefined,
        preAuthNumber: docs.preAuth ? preAuthNumber || undefined : undefined,
        xraysAttached: docs.xrays,
        perioCharting: docs.perioChart,
        preAuthObtained: docs.preAuth,
        narrativeIncluded: docs.narrative,
      }),
    });

    if (res.ok) {
      const claim = await res.json();
      // Auto-trigger analysis in the background
      fetch(`/api/claims/${claim.id}/analyze`, { method: 'POST' }).catch(console.error);
      router.push(`/claims/${claim.id}`);
    } else {
      setLoading(false);
      alert('Failed to create claim. Please check all fields and try again.');
    }
  }

  const addToothNumber = () => setToothNumbers([...toothNumbers, '']);
  const removeToothNumber = (i: number) => setToothNumbers(toothNumbers.filter((_, idx) => idx !== i));
  const updateToothNumber = (i: number, val: string) => {
    const n = val.replace(/\D/g, '').slice(0, 2);
    const updated = [...toothNumbers];
    updated[i] = n;
    setToothNumbers(updated);
  };

  const addCdtCode = () => setCdtCodes([...cdtCodes, '']);
  const removeCdtCode = (i: number) => setCdtCodes(cdtCodes.filter((_, idx) => idx !== i));
  const updateCdtCode = (i: number, val: string) => {
    const updated = [...cdtCodes];
    updated[i] = val.toUpperCase();
    setCdtCodes(updated);
  };

  return (
    <div>
      <Header title="New Claim" subtitle="Submit a new dental insurance claim for AI analysis" />
      <div className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Patient Name *</Label>
                <Input
                  value={form.patientName}
                  onChange={e => setForm({ ...form, patientName: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={form.patientDob}
                  onChange={e => setForm({ ...form, patientDob: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Insurance Member ID *</Label>
                <Input
                  value={form.patientInsuranceId}
                  onChange={e => setForm({ ...form, patientInsuranceId: e.target.value })}
                  placeholder="e.g., DD-123456789"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Treating Provider NPI</Label>
                <Input
                  value={form.providerNpi}
                  onChange={e => setForm({ ...form, providerNpi: e.target.value })}
                  placeholder="e.g., 1234567890"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payer *</Label>
                <Select value={form.payerId || ''} onValueChange={v => setForm({ ...form, payerId: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payer" />
                  </SelectTrigger>
                  <SelectContent>
                    {payers.map(p => (
                      <SelectItem key={p.payerId} value={p.payerId}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Type *</Label>
                <Select value={form.planType} onValueChange={v => setForm({ ...form, planType: v ?? 'PPO' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Claim Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claim Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Date *</Label>
                  <Input
                    type="date"
                    value={form.serviceDate}
                    onChange={e => setForm({ ...form, serviceDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.totalAmount}
                    onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>CDT Codes *</Label>
                {cdtCodes.map((code, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={code}
                      onChange={e => updateCdtCode(i, e.target.value)}
                      placeholder="e.g., D2740"
                      className="font-mono"
                      list="cdt-list"
                    />
                    <datalist id="cdt-list">
                      {Object.keys(CDT_CODES).map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {cdtCodes.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCdtCode(i)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
                {cdtCodes.length < 15 && (
                  <Button type="button" variant="outline" size="sm" onClick={addCdtCode}>
                    <Plus className="h-4 w-4 mr-1" /> Add CDT Code
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tooth Numbers</Label>
                <p className="text-xs text-gray-500">Enter tooth numbers 1–32 for the treated teeth</p>
                {toothNumbers.map((num, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={num}
                      onChange={e => updateToothNumber(i, e.target.value)}
                      placeholder="e.g., 14"
                      className="font-mono w-24"
                      inputMode="numeric"
                    />
                    {toothNumbers.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeToothNumber(i)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addToothNumber}>
                  <Plus className="h-4 w-4 mr-1" /> Add Tooth Number
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Diagnosis Codes (ICD-10)</Label>
                {diagnosisCodes.map((code, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={code}
                      onChange={e => {
                        const updated = [...diagnosisCodes];
                        updated[i] = e.target.value;
                        setDiagnosisCodes(updated);
                      }}
                      placeholder="e.g., K02.9"
                      className="font-mono"
                    />
                    {diagnosisCodes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDiagnosisCodes(diagnosisCodes.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDiagnosisCodes([...diagnosisCodes, ''])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Diagnosis Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentation Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { key: 'xrays', label: 'X-rays attached' },
                { key: 'perioChart', label: 'Periodontal chart included' },
                { key: 'preAuth', label: 'Pre-authorization obtained' },
                { key: 'narrative', label: 'Narrative/clinical notes included' },
              ] as { key: keyof typeof docs; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={docs[key]}
                      onCheckedChange={v => setDocs({ ...docs, [key]: !!v })}
                    />
                    <Label htmlFor={key} className="cursor-pointer font-normal">
                      {label}
                    </Label>
                  </div>
                  {key === 'preAuth' && docs.preAuth && (
                    <div className="mt-2 ml-6">
                      <Input
                        value={preAuthNumber}
                        onChange={e => setPreAuthNumber(e.target.value)}
                        placeholder="Pre-authorization number"
                        className="max-w-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="bg-[#0F4C81] hover:bg-[#1E6BB8]" disabled={loading}>
              {loading ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-spin" /> Saving & Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" /> Save & Run AI Analysis
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
