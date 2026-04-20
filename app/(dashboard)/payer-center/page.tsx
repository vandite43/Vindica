import Header from '@/components/layout/Header';
import PayerIntelClient from '@/components/payer-intel/PayerIntelClient';

export const metadata = { title: 'Payer Intelligence Center — Vyndico' };

export default function PayerCenterPage() {
  return (
    <div>
      <Header
        title="Payer Intelligence Center"
        subtitle="Deep behavioral profiles for major dental payers — triggers, tactics, and traps"
      />
      <PayerIntelClient />
    </div>
  );
}
