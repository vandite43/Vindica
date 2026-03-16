'use client';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AI_MODELS } from '@/lib/constants';
import { useAIModel } from '@/lib/hooks/useAIModel';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export default function SettingsPage() {
  const { model, setModel } = useAIModel();

  return (
    <div>
      <Header title="Settings" subtitle="Practice account settings" />
      <div className="p-6 max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Model</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Choose the default Claude model for claim analysis and appeal generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all',
                  model === m.id
                    ? 'border-[#5B3FD4] bg-[#5B3FD4]/5 ring-1 ring-[#5B3FD4]'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div>
                  <p className={cn('font-medium text-sm', model === m.id ? 'text-[#5B3FD4]' : 'text-gray-800')}>
                    {m.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                </div>
                {model === m.id && <Check className="h-4 w-4 text-[#5B3FD4] shrink-0" />}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Practice settings coming soon.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Notification settings coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
