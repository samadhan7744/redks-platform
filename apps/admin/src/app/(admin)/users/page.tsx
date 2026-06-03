'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/state-view';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, unwrapMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { User } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error } = useApi(
    async () => unwrapMeta<User>(await api.get('/users', { params: { search, role: role || undefined, status: status || undefined, limit: 50 } })),
    [search, role, status],
  );

  return (
    <>
      <PageHeader title="Users" description="Search users by phone, name, role, and status." />
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SHOP_OWNER">Shop owner</option>
          <option value="RIDER">Rider</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
        </Select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <DataTable
          rows={data.data}
          columns={[
            { key: 'user', header: 'User', render: (row) => <div><div className="font-medium">{row.name ?? '-'}</div><div className="text-xs text-muted-foreground">{row.phone}</div></div> },
            { key: 'email', header: 'Email', render: (row) => row.email ?? '-' },
            { key: 'roles', header: 'Roles', render: (row) => <div className="flex flex-wrap gap-1">{row.roles.map((item) => <StatusBadge key={item} value={item} />)}</div> },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) },
          ]}
        />
      ) : null}
    </>
  );
}
