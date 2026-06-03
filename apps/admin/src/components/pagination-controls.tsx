import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function PaginationControls({
  meta,
  onPageChange,
}: {
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-sm sm:flex-row sm:items-center">
      <div className="text-muted-foreground">
        Page {meta.page} of {meta.totalPages} · {meta.total} records
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
