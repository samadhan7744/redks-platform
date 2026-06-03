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
import { api, unwrap, unwrapMeta } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Order } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, loading, error } = useApi(
    async () => unwrapMeta<Order>(await api.get('/admin/orders', { params: { search, status: status || undefined, page, limit: 20 } })),
    [search, status, page],
  );
  const selected = useApi(
    async () => (selectedId ? unwrap<Order>(await api.get(`/admin/orders/${selectedId}`)) : null),
    [selectedId],
  );

  return (
    <>
      <PageHeader title="Orders" description="Inspect order lifecycle, payment status, and items." />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search order number" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="PLACED">Placed</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="READY_FOR_PICKUP">Ready</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="OUT_FOR_DELIVERY">Out for delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>
      <div>
          {loading ? <LoadingState /> : null}
          {error ? <ErrorState message={error} /> : null}
          {data ? (
            <DataTable
              rows={data.data}
              columns={[
                { key: 'order', header: 'Order', render: (row) => <button className="font-medium text-primary" onClick={() => setSelectedId(row.id)}>{row.orderNumber}</button> },
                { key: 'customer', header: 'Customer', render: (row) => row.customer?.name ?? row.customer?.phone ?? '-' },
                { key: 'shop', header: 'Shop', render: (row) => row.shop?.name ?? '-' },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
                { key: 'payment', header: 'Payment', render: (row) => <div><div>{row.paymentMethod}</div><StatusBadge value={row.paymentStatus} /></div> },
                { key: 'total', header: 'Total', render: (row) => formatCurrency(row.totalAmount) },
                { key: 'placed', header: 'Placed', render: (row) => formatDate(row.placedAt) },
              ]}
            />
          ) : null}
          <PaginationControls meta={data?.meta} onPageChange={setPage} />
        </div>
        <Modal title="Order details" open={!!selectedId} onClose={() => setSelectedId(null)}>
            {selected.loading && selectedId ? <LoadingState /> : null}
            {selected.error ? <ErrorState message={selected.error} /> : null}
            {selected.data ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-slate-50 p-4">
                  <span className="text-muted-foreground">Order</span><span className="font-medium">{selected.data.orderNumber}</span>
                  <span className="text-muted-foreground">Customer</span><span>{selected.data.customer?.phone ?? '-'}</span>
                  <span className="text-muted-foreground">Shop</span><span>{selected.data.shop?.name ?? '-'}</span>
                  <span className="text-muted-foreground">Status</span><span><StatusBadge value={selected.data.status} /></span>
                  <span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(selected.data.subtotal)}</span>
                  <span className="text-muted-foreground">Delivery</span><span>{formatCurrency(selected.data.deliveryFee)}</span>
                  <span className="text-muted-foreground">Platform</span><span>{formatCurrency(selected.data.platformFee)}</span>
                  <span className="text-muted-foreground">Total</span><span className="font-semibold">{formatCurrency(selected.data.totalAmount)}</span>
                </div>
                <div className="rounded-md border">
                  {selected.data.items?.map((item) => (
                    <div key={item.id} className="flex justify-between border-b p-3 last:border-b-0">
                      <span>{item.name} x {item.quantity}</span>
                      <span>{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
        </Modal>
    </>
  );
}
