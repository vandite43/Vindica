import Header from '@/components/layout/Header';
import ROICalculatorClient from '@/components/roi-calculator/ROICalculatorClient';

export const metadata = { title: 'Appeal ROI Calculator — Vindica' };

export default function ROICalculatorPage() {
  return (
    <div>
      <Header title="Appeal ROI Calculator" subtitle="Decide which denied claims are worth appealing" />
      <ROICalculatorClient />
    </div>
  );
}
