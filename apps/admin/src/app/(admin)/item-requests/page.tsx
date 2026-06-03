'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/state-view';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, unwrap } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ItemRequest } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function ItemRequestsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error } = useApi(async () => unwrap<ItemRequest[]>(await api.get('/item-requests')), []);
  const filtered = (data ?? []).filter((request) => {
    const matchesSearch = search ? request.description.toLowerCase().includes(search.toLowerCase()) : true;
    const matchesStatus = status ? request.status === status : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageHeader title="Item Requests" description="Track customer Request Any Item demand and shop quotes." />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search request text" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="QUOTED">Quoted</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <DataTable
          rows={filtered}
          columns={[
            { key: 'description', header: 'Request', render: (row) => <div className="max-w-md">{row.description}</div> },
            { key: 'customer', header: 'Customer', render: (row) => row.customer?.phone ?? '-' },
            { key: 'location', header: 'Location', render: (row) => `${row.city?.name ?? '-'} / ${row.zone?.name ?? '-'}` },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'quote', header: 'Quote', render: (row) => row.quotedAmount ? formatCurrency(row.quotedAmount) : '-' },
            { key: 'quotes', header: 'Quotes', render: (row) => row.quotes?.length ?? 0 },
            { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) },
          ]}
        />
      ) : null}
    </>
  );
}
