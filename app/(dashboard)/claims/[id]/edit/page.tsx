'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PLAN_TYPES, CDT_CODES } from '@/lib/constants';

interface Payer {
  id: string;
  payerId: string;
  name: string;
}

export default function EditClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
    planType: 'PPO',
    serviceDate: '',
    claimDate: '',
    totalAmount: '',
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/claims/${id}`).then(r => r.json()),
      fetch('/api/payers').then(r => r.json()),
    ]).then(([claim, payerList]) => {
      setPayers(Array.isArray(payerList) ? payerList : []);
      setForm({
        patientName: claim.patientName ?? '',
        patientDob: claim.patientDob ? claim.patientDob.split('T')[0] : '',
        patientInsuranceId: claim.patientInsuranceId ?? '',
        providerNpi: claim.providerNpi ?? '',
        payerId: claim.payerId ?? '',
        planType: claim.planType ?? 'PPO',
        serviceDate: claim.serviceDate ? claim.serviceDate.split('T')[0] : '',
        claimDate: claim.claimDate ? claim.claimDate.split('T')[0] : '',
        totalAmount: String(claim.totalAmount ?? ''),
      });
      setCdtCodes(claim.cdtCodes?.length ? claim.cdtCodes : ['']);
      setToothNumbers(claim.toothNumbers?.length ? claim.toothNumbers : ['']);
      setDiagnosisCodes(claim.diagnosisCodes?.length ? claim.diagnosisCodes : ['']);
      setDocs({
        xrays: claim.xraysAttached ?? false,
        perioChart: claim.perioCharting ?? false,
        preAuth: claim.preAuthObtained ?? false,
        narrative: claim.narrativeIncluded ?? false,
      });
      setPreAuthNumber(claim.preAuthNumber ?? '');
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const selectedPayer = payers.find(p => p.payerId === form.payerId);

    const res = await fetch(`/api/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        payerName: selectedPayer?.name,
        patientDob: new Date(form.patientDob),
        serviceDate: new Date(form.serviceDate),
        claimDate: new Date(form.claimDate),
        totalAmount: parseFloat(form.totalAmount),
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
      router.push(`/claims/${id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      alert(`Failed to save: ${data.error || res.status}`);
    }
  }

  const addCdtCode = () => setCdtCodes([...cdtCodes, '']);
  const removeCdtCode = (i: number) => setCdtCodes(cdtCodes.filter((_, idx) => idx !== i));
  const updateCdtCode = (i: number, val: string) => {
    const updated = [...cdtCodes];
    updated[i] = val.toUpperCase();
    setCdtCodes(updated);
  };

  const addToothNumber = () => setToothNumbers([...toothNumbers, '']);
  const removeToothNumber = (i: number) => setToothNumbers(toothNumbers.filter((_, idx) => idx !== i));
  const updateToothNumber = (i: number, val: string) => {
    const n = val.replace(/\D/g, '').slice(0, 2);
    const updated = [...toothNumbers];
    updated[i] = n;
    setToothNumbers(updated);
  };

  if (fetching) {
    return (
      <div>
        <Header title="Edit Claim" />
        <div className="p-6 max-w-3xl space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Edit Claim" subtitle="Update claim details before submission" />
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
                <Select value={form.payerId} onValueChange={v => setForm({ ...form, payerId: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payer" />
                  </SelectTrigger>
                  <SelectContent>
                    {payers.map(p => (
                      <SelectItem key={p.payerId} value={p.payerId}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Type *</Label>
                <Select value={form.planType} onValueChange={v => setForm({ ...form, planType: v ?? 'PPO' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
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
                      {Object.keys(CDT_CODES).map(c => <option key={c} value={c} />)}
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
                <Button type="button" variant="outline" size="sm" onClick={() => setDiagnosisCodes([...diagnosisCodes, ''])}>
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
                      id={`edit-${key}`}
                      checked={docs[key]}
                      onCheckedChange={v => setDocs({ ...docs, [key]: !!v })}
                    />
                    <Label htmlFor={`edit-${key}`} className="cursor-pointer font-normal">
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
            <Button type="submit" disabled={loading} style={{ backgroundColor: '#5B3FD4' }} className="text-white">
              {loading ? (
                <><Save className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Changes</>
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
