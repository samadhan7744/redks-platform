'use client';

import { FormEvent, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/state-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, getErrorMessage, unwrap } from '@/lib/api';
import { Category } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function CategoriesPage() {
  const { data, loading, error, reload } = useApi(async () => unwrap<Category[]>(await api.get('/categories')), []);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [commission, setCommission] = useState('10');
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await api.post('/categories', {
        name,
        parentId: parentId || undefined,
        defaultCommissionPercent: Number(commission),
      });
      setName('');
      setParentId('');
      await reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function deactivate(id: string) {
    await api.delete(`/categories/${id}`);
    await reload();
  }

  return (
    <>
      <PageHeader title="Categories" description="Manage catalogue taxonomy and commission defaults." />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />New category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
              <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">No parent</option>
                {data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Input type="number" placeholder="Commission %" value={commission} onChange={(e) => setCommission(e.target.value)} />
              {formError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div> : null}
              <Button disabled={!name}><Save className="h-4 w-4" />Create</Button>
            </form>
          </CardContent>
        </Card>
        <div>
          {loading ? <LoadingState /> : null}
          {error ? <ErrorState message={error} /> : null}
          {data ? (
            <DataTable
              rows={data}
              columns={[
                { key: 'name', header: 'Category', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.slug}</div></div> },
                { key: 'parent', header: 'Parent', render: (row) => row.parent?.name ?? '-' },
                { key: 'commission', header: 'Commission', render: (row) => `${row.defaultCommissionPercent ?? 0}%` },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                { key: 'actions', header: 'Actions', render: (row) => <Button size="sm" variant="outline" onClick={() => deactivate(row.id)}><Trash2 className="h-3 w-3" />Deactivate</Button> },
              ]}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
