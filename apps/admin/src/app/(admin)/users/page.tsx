'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PaginationControls } from '@/components/pagination-controls';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/state-view';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { api, getErrorMessage, unwrapMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { User } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', status: 'ACTIVE' });
  const [formError, setFormError] = useState<string | null>(null);
  const { data, loading, error, reload } = useApi(
    async () => unwrapMeta<User>(await api.get('/users', { params: { search, role: role || undefined, status: status || undefined, page, limit: 20 } })),
    [search, role, status, page],
  );

  function openUser(user: User) {
    setSelected(user);
    setForm({ name: user.name ?? '', email: user.email ?? '', status: user.status });
    setFormError(null);
  }

  async function saveUser() {
    if (!selected) return;
    setFormError(null);
    try {
      await api.patch(`/users/${selected.id}`, {
        name: form.name || undefined,
        email: form.email || undefined,
        status: form.status,
      });
      setSelected(null);
      await reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title="Users" description="Search users by phone, name, role, and status." />
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SHOP_OWNER">Shop owner</option>
          <option value="RIDER">Rider</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
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
            { key: 'user', header: 'User', render: (row) => <button className="text-left" onClick={() => openUser(row)}><div className="font-medium text-primary">{row.name ?? '-'}</div><div className="text-xs text-muted-foreground">{row.phone}</div></button> },
            { key: 'email', header: 'Email', render: (row) => row.email ?? '-' },
            { key: 'roles', header: 'Roles', render: (row) => <div className="flex flex-wrap gap-1">{row.roles.map((item) => <StatusBadge key={item} value={item} />)}</div> },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'created', header: 'Created', render: (row) => formatDate(row.createdAt) },
          ]}
        />
      ) : null}
      <PaginationControls meta={data?.meta} onPageChange={setPage} />
      <Modal title="User details" open={!!selected} onClose={() => setSelected(null)}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="BLOCKED">Blocked</option>
                <option value="PENDING_APPROVAL">Pending approval</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <Input value={selected?.phone ?? ''} disabled />
            </div>
          </div>
          {formError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={saveUser}>Save changes</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
