import Header from '@/components/layout/Header';
import MonthEndClient from '@/components/month-end/MonthEndClient';

export const metadata = { title: 'Month End Close — Vyndico' };

export default function MonthEndPage() {
  return (
    <div>
      <Header title="Month End Close" subtitle="Complete all billing close steps before locking the period" />
      <MonthEndClient />
    </div>
  );
}
