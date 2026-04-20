'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AI_MODELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';

interface AIModelCardProps {
  isSuperAdmin: boolean;
}

export default function AIModelCard({ isSuperAdmin }: AIModelCardProps) {
  const [model,   setModelState] = useState<string>('');
  const [saving,  setSaving]     = useState(false);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    fetch('/api/system/config')
      .then(r => r.json())
      .then(d => { if (d.aiModel) setModelState(d.aiModel); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(id: string) {
    if (!isSuperAdmin || saving || id === model) return;
    setSaving(true);
    try {
      const res = await fetch('/api/system/config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ aiModel: id }),
      });
      if (res.ok) setModelState(id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">AI Model</CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              {isSuperAdmin
                ? 'Select the Claude model used for all claim analysis and appeal generation across all practices.'
                : 'The AI model used for claim analysis and appeal generation. Contact a super admin to change.'}
            </CardDescription>
          </div>
          {!isSuperAdmin && (
            <Lock className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          AI_MODELS.map((m) => {
            const isSelected = model === m.id;
            const clickable  = isSuperAdmin && !saving;
            return (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id)}
                disabled={!clickable}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'border-[#5B3FD4] bg-[#5B3FD4]/5 ring-1 ring-[#5B3FD4]'
                    : 'border-gray-200',
                  clickable && !isSelected && 'hover:border-gray-300 hover:bg-gray-50 cursor-pointer',
                  !isSuperAdmin && 'cursor-default opacity-90',
                )}
              >
                <div>
                  <p className={cn('font-medium text-sm', isSelected ? 'text-[#5B3FD4]' : 'text-gray-800')}>
                    {m.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-[#5B3FD4] shrink-0" />}
              </button>
            );
          })
        )}
        {!isSuperAdmin && (
          <p className="text-xs text-gray-400 pt-1">
            Model selection is controlled globally by a super admin.
          </p>
        )}
        {saving && (
          <p className="text-xs text-[#5B3FD4]">Saving…</p>
        )}
      </CardContent>
    </Card>
  );
}
