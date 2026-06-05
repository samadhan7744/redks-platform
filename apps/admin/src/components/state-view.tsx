import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border bg-white text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
      <AlertCircle className="h-5 w-5" />
      <div className="font-semibold">Unable to load data</div>
      <div>{message}</div>
    </div>
  );
}

export function EmptyState({ title = 'No records found' }: { title?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border bg-white p-5 text-center text-sm text-muted-foreground">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-primary">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="font-semibold text-slate-900">{title}</div>
    </div>
  );
}
