import { cn } from '@/lib/utils';

const toneMap: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  PLACED: 'bg-amber-50 text-amber-700 border-amber-200',
  READY_FOR_PICKUP: 'bg-blue-50 text-blue-700 border-blue-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  PICKED_UP: 'bg-blue-50 text-blue-700 border-blue-200',
  ONLINE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OFFLINE: 'bg-slate-100 text-slate-700 border-slate-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
  DELETED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function StatusBadge({ value }: { value?: string | null }) {
  const label = value ?? '-';
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-bold',
        toneMap[label] ?? 'bg-slate-50 text-slate-700 border-slate-200',
      )}
    >
      {label.replaceAll('_', ' ')}
    </span>
  );
}
