import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

export default function AppealStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', STATUS_STYLES[status] || STATUS_STYLES.DRAFT)}>
      {status}
    </span>
  );
}
