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
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error } = useApi(
    async () => unwrapMeta<Product>(await api.get('/products', { params: { search, status: status || undefined, limit: 50 } })),
    [search, status],
  );

  return (
    <>
      <PageHeader title="Products" description="Catalogue visibility across shops and categories." />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Active products</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
          <option value="DELETED">Deleted</option>
        </Select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <DataTable
          rows={data.data}
          columns={[
            { key: 'name', header: 'Product', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.unit ?? 'piece'}</div></div> },
            { key: 'shop', header: 'Shop', render: (row) => row.shop?.name ?? '-' },
            { key: 'category', header: 'Category', render: (row) => row.category?.name ?? '-' },
            { key: 'price', header: 'Price', render: (row) => formatCurrency(row.price) },
            { key: 'stock', header: 'Stock', render: (row) => row.stock },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          ]}
        />
      ) : null}
    </>
  );
}
