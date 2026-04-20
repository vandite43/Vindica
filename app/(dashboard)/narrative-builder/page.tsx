import Header from '@/components/layout/Header';
import NarrativeBuilderClient from '@/components/narrative-builder/NarrativeBuilderClient';

export const metadata = { title: 'Clinical Narrative Builder — Vyndico' };

export default function NarrativeBuilderPage() {
  return (
    <div>
      <Header
        title="Clinical Narrative Builder"
        subtitle="Compose payer-compliant clinical narratives with real-time compliance scanning"
      />
      <NarrativeBuilderClient />
    </div>
  );
}
