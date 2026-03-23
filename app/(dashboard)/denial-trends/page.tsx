import Header from '@/components/layout/Header';
import DenialTrendsDashboard from '@/components/denial-trends/DenialTrendsDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Denial Trends — Vindica' };

export default function DenialTrendsPage() {
  return (
    <div>
      <Header
        title="Denial Trends"
        subtitle="Analyze denial patterns, identify problem areas, and track your denial rate over time"
      />
      <DenialTrendsDashboard />
    </div>
  );
}
