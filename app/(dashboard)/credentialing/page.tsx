import Header from '@/components/layout/Header';
import CredentialingClient from '@/components/credentialing/CredentialingClient';

export const metadata = { title: 'Credentialing Tracker — Vindica' };

export default function CredentialingPage() {
  return (
    <div>
      <Header title="Credentialing Tracker" subtitle="Track provider NPI and payer credentialing status" />
      <CredentialingClient />
    </div>
  );
}
