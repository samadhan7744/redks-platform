import { AlertCircle, Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="h-4 w-4" />
      {message}
    </div>
  );
}

export function EmptyState({ title = 'No records found' }: { title?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border bg-white p-4 text-sm text-muted-foreground">
      {title}
    </div>
  );
}
