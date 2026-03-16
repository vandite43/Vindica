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
  const [diagnosisCodes, setDiagnosisCodes] = useState(['']);
  const [docs, setDocs] = useState({ xrays: false, perioChart: false, preAuth: false, narrative: false });
  const [form, setForm] = useState({
    patientName: '',
    patientDob: '',
    patientInsuranceId: '',
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
        payerId: claim.payerId ?? '',
        planType: claim.planType ?? 'PPO',
        serviceDate: claim.serviceDate ? claim.serviceDate.split('T')[0] : '',
        claimDate: claim.claimDate ? claim.claimDate.split('T')[0] : '',
        totalAmount: String(claim.totalAmount ?? ''),
      });
      setCdtCodes(claim.cdtCodes?.length ? claim.cdtCodes : ['']);
      setDiagnosisCodes(claim.diagnosisCodes?.length ? claim.diagnosisCodes : ['']);
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
        diagnosisCodes: diagnosisCodes.filter(Boolean),
      }),
    });

    if (res.ok) {
      router.push(`/claims/${id}`);
    } else {
      setLoading(false);
      alert('Failed to save changes.');
    }
  }

  const addCdtCode = () => setCdtCodes([...cdtCodes, '']);
  const removeCdtCode = (i: number) => setCdtCodes(cdtCodes.filter((_, idx) => idx !== i));
  const updateCdtCode = (i: number, val: string) => {
    const updated = [...cdtCodes];
    updated[i] = val.toUpperCase();
    setCdtCodes(updated);
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
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { key: 'xrays', label: 'X-rays attached' },
                { key: 'perioChart', label: 'Periodontal chart included' },
                { key: 'preAuth', label: 'Pre-authorization obtained' },
                { key: 'narrative', label: 'Narrative/clinical notes included' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-${key}`}
                    checked={docs[key as keyof typeof docs]}
                    onCheckedChange={v => setDocs({ ...docs, [key]: !!v })}
                  />
                  <Label htmlFor={`edit-${key}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
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
