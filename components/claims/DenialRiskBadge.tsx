import { cn } from '@/lib/utils';
import { RISK_COLORS } from '@/lib/constants';

interface Props {
  riskLevel?: string | null;
  score?: number | null;
  size?: 'sm' | 'md';
}

export default function DenialRiskBadge({ riskLevel, score, size = 'md' }: Props) {
  if (!riskLevel) return <span className="text-gray-400 text-sm">Not analyzed</span>;

  const colorClass = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] || RISK_COLORS.MEDIUM;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      colorClass
    )}>
      {score !== null && score !== undefined && <span className="font-bold">{Math.round(score)}</span>}
      {riskLevel}
    </span>
  );
}
