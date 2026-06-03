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
import { Rider } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function RidersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(
    async () =>
      unwrapMeta<Rider>(
        await api.get('/admin/riders', {
          params: {
            search,
            status: status || undefined,
            availabilityStatus: availabilityStatus || undefined,
            page,
            limit: 20,
          },
        }),
      ),
    [search, status, availabilityStatus, page],
  );

  async function updateStatus(id: string, nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    await api.patch(`/admin/riders/${id}/status`, {
      status: nextStatus,
      rejectionReason: nextStatus === 'REJECTED' ? 'Rejected from admin panel' : undefined,
    });
    await reload();
  }

  return (
    <>
      <PageHeader title="Riders" description="Review rider approvals, availability, and service zones." />
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search rider name, phone, email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All approval statuses</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
        <Select value={availabilityStatus} onChange={(e) => { setAvailabilityStatus(e.target.value); setPage(1); }}>
          <option value="">All availability</option>
          <option value="OFFLINE">Offline</option>
          <option value="AVAILABLE">Available</option>
          <option value="BUSY">Busy</option>
          <option value="ON_DELIVERY">On delivery</option>
        </Select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <DataTable
          rows={data.data}
          columns={[
            { key: 'rider', header: 'Rider', render: (row) => <div><div className="font-medium">{row.user?.name ?? '-'}</div><div className="text-xs text-muted-foreground">{row.user?.phone ?? '-'}</div></div> },
            { key: 'vehicle', header: 'Vehicle', render: (row) => <div><div>{row.vehicleType ?? '-'}</div><div className="text-xs text-muted-foreground">{row.vehicleNumber ?? '-'}</div></div> },
            { key: 'location', header: 'Zone', render: (row) => `${row.city?.name ?? '-'} / ${row.zone?.name ?? '-'}` },
            { key: 'status', header: 'Approval', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'availability', header: 'Availability', render: (row) => <StatusBadge value={row.availabilityStatus} /> },
            { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, 'APPROVED')}><Check className="h-3 w-3" />Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, 'REJECTED')}><X className="h-3 w-3" />Reject</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(row.id, 'SUSPENDED')}><ShieldOff className="h-3 w-3" />Suspend</Button>
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
