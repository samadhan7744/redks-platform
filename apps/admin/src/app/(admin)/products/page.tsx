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
import { api, unwrapMeta } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);
  const { data, loading, error } = useApi(
    async () => unwrapMeta<Product>(await api.get('/admin/products', { params: { search, status: status || undefined, page, limit: 20 } })),
    [search, status, page],
  );

  return (
    <>
      <PageHeader title="Products" description="Catalogue visibility across shops and categories." />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
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
            { key: 'name', header: 'Product', render: (row) => <button className="text-left" onClick={() => setSelected(row)}><div className="font-medium text-primary">{row.name}</div><div className="text-xs text-muted-foreground">{row.unit ?? 'piece'}</div></button> },
            { key: 'shop', header: 'Shop', render: (row) => row.shop?.name ?? '-' },
            { key: 'category', header: 'Category', render: (row) => row.category?.name ?? '-' },
            { key: 'price', header: 'Price', render: (row) => formatCurrency(row.price) },
            { key: 'stock', header: 'Stock', render: (row) => row.stock },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          ]}
        />
      ) : null}
      <PaginationControls meta={data?.meta} onPageChange={setPage} />
      <Modal title="Product details" open={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Name</span><div className="font-medium">{selected.name}</div></div>
            <div><span className="text-muted-foreground">Status</span><div><StatusBadge value={selected.status} /></div></div>
            <div><span className="text-muted-foreground">Shop</span><div>{selected.shop?.name ?? '-'}</div></div>
            <div><span className="text-muted-foreground">Category</span><div>{selected.category?.name ?? '-'}</div></div>
            <div><span className="text-muted-foreground">Price</span><div>{formatCurrency(selected.price)}</div></div>
            <div><span className="text-muted-foreground">Stock</span><div>{selected.stock}</div></div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
