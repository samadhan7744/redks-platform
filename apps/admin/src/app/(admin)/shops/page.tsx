'use client';

import { useState } from 'react';
import { Check, Search, ShieldOff, X } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/state-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, unwrapMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Shop } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function ShopsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(
    async () => unwrapMeta<Shop>(await api.get('/admin/shops', { params: { search, status: status || undefined, page, limit: 20 } })),
    [search, status, page],
  );

  async function action(id: string, type: 'approve' | 'reject' | 'suspend') {
    const body = type === 'reject' ? { reason: 'Rejected from admin panel' } : undefined;
    await api.patch(`/admin/shops/${id}/${type}`, body);
    await reload();
  }

  return (
    <>
      <PageHeader title="Shops" description="Review shop onboarding and operational status." />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search shops or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <DataTable
          rows={data.data}
          columns={[
            { key: 'name', header: 'Shop', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.phone}</div></div> },
            { key: 'owner', header: 'Owner', render: (row) => row.owner?.name ?? row.owner?.phone ?? '-' },
            { key: 'location', header: 'Location', render: (row) => `${row.city?.name ?? '-'} / ${row.zone?.name ?? '-'}` },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => action(row.id, 'approve')}><Check className="h-3 w-3" />Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => action(row.id, 'reject')}><X className="h-3 w-3" />Reject</Button>
                  <Button size="sm" variant="destructive" onClick={() => action(row.id, 'suspend')}><ShieldOff className="h-3 w-3" />Suspend</Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}
      <PaginationControls meta={data?.meta} onPageChange={setPage} />
    </>
  );
}
