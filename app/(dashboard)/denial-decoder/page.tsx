import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import DenialDecoderClient from '@/components/denial-decoder/DenialDecoderClient';

export const metadata = { title: 'Denial Decoder — Vyndico' };

export default function DenialDecoderPage() {
  return (
    <div>
      <Header title="Denial Decoder" subtitle="Look up any CARC code and get actionable guidance" />
      <Suspense>
        <DenialDecoderClient />
      </Suspense>
    </div>
  );
}
