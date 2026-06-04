'use client';

import { useState } from 'react';
import { Check, Eye, Search, ShieldOff, X } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PaginationControls } from '@/components/pagination-controls';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/state-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, unwrap, unwrapMeta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Category, City, Shop } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function ShopsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Shop | null>(null);
  const [reason, setReason] = useState('');
  const [commission, setCommission] = useState('10');
  const { data: cities } = useApi(
    async () => unwrap<City[]>(await api.get('/cities')),
    [],
  );
  const { data: categories } = useApi(
    async () => unwrap<Category[]>(await api.get('/categories')),
    [],
  );
  const { data, loading, error, reload } = useApi(
    async () =>
      unwrapMeta<Shop>(
        await api.get('/admin/shops', {
          params: {
            search,
            status: status || undefined,
            cityId: cityId || undefined,
            categoryId: categoryId || undefined,
            page,
            limit: 20,
          },
        }),
      ),
    [search, status, cityId, categoryId, page],
  );

  async function loadShop(id: string) {
    const shop = unwrap<Shop>(await api.get(`/admin/shops/${id}`));
    setSelected(shop);
    setReason(shop.rejectionReason ?? '');
    setCommission(String(shop.commissionPercent ?? 10));
  }

  async function action(id: string, type: 'approve' | 'reject' | 'suspend') {
    const body =
      type === 'reject'
        ? { reason: reason || 'Rejected from admin panel' }
        : undefined;
    await api.patch(`/admin/shops/${id}/${type}`, body);
    await reload();
    await loadShop(id);
  }

  async function updateCommission(id: string) {
    await api.patch(`/admin/shops/${id}/commission`, {
      commissionPercent: Number(commission),
    });
    await reload();
    await loadShop(id);
  }

  async function documentStatus(
    shopId: string,
    documentId: string,
    docStatus: 'APPROVED' | 'REJECTED',
  ) {
    await api.patch(`/admin/shops/${shopId}/documents/${documentId}/status`, {
      status: docStatus,
      rejectionReason:
        docStatus === 'REJECTED'
          ? reason || 'Document rejected by admin'
          : undefined,
    });
    await loadShop(shopId);
  }

  return (
    <>
      <PageHeader
        title="Shops"
        description="Review onboarding, verification documents, and commercial settings."
      />
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search shops or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
        <Select
          value={cityId}
          onChange={(e) => {
            setCityId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All cities</option>
          {(cities ?? []).map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {(categories ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <DataTable
          rows={data.data}
          columns={[
            {
              key: 'name',
              header: 'Shop',
              render: (row) => (
                <div>
                  <div className="font-medium">{row.shopName ?? row.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.ownerPhone ?? row.phone}
                  </div>
                </div>
              ),
            },
            {
              key: 'owner',
              header: 'Owner',
              render: (row) =>
                row.ownerName ?? row.owner?.name ?? row.owner?.phone ?? '-',
            },
            {
              key: 'category',
              header: 'Category',
              render: (row) =>
                row.category?.name ??
                row.categories?.[0]?.category?.name ??
                '-',
            },
            {
              key: 'location',
              header: 'Location',
              render: (row) =>
                `${row.city?.name ?? '-'} / ${row.zone?.name ?? '-'}`,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <div className="flex flex-col gap-1">
                  <StatusBadge value={row.status} />
                  <StatusBadge value={row.verificationStatus ?? 'PENDING'} />
                </div>
              ),
            },
            {
              key: 'created',
              header: 'Created',
              render: (row) => formatDate(row.createdAt),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadShop(row.id)}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => action(row.id, 'approve')}
                  >
                    <Check className="h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReason('Rejected from admin panel');
                      void action(row.id, 'reject');
                    }}
                  >
                    <X className="h-3 w-3" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => action(row.id, 'suspend')}
                  >
                    <ShieldOff className="h-3 w-3" />
                    Suspend
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}
      <PaginationControls meta={data?.meta} onPageChange={setPage} />

      <Modal
        title="Shop Verification"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-5">
            <section className="grid gap-3 md:grid-cols-2">
              <Info label="Shop" value={selected.shopName ?? selected.name} />
              <Info
                label="Owner"
                value={`${selected.ownerName ?? '-'} / ${selected.ownerPhone ?? selected.phone}`}
              />
              <Info
                label="Category"
                value={
                  selected.category?.name ??
                  selected.categories?.[0]?.category?.name ??
                  '-'
                }
              />
              <Info
                label="Location"
                value={`${selected.addressLine1 ?? '-'} ${selected.addressLine2 ?? ''}, ${selected.city?.name ?? '-'} / ${selected.zone?.name ?? '-'} ${selected.pincode ?? ''}`}
              />
              <Info label="UPI" value={selected.upiId ?? '-'} />
              <Info label="GST" value={selected.gstNumber ?? '-'} />
              <Info label="FSSAI" value={selected.fssaiNumber ?? '-'} />
              <Info label="PAN" value={selected.panNumber ?? '-'} />
              <Info
                label="Delivery"
                value={`${selected.deliveryMode} / ${selected.deliveryRadiusKm ?? '-'} km`}
              />
              <Info
                label="Min order"
                value={`Rs ${selected.minOrderValue ?? 0}`}
              />
              <Info
                label="Timings"
                value={`${selected.openingTime ?? '-'} - ${selected.closingTime ?? '-'}, off: ${selected.weeklyOffDay ?? '-'}`}
              />
              <Info
                label="Commission"
                value={`${selected.commissionPercent ?? 10}%`}
              />
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Documents</h3>
              <div className="space-y-2">
                {(selected.documents ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded yet.
                  </p>
                ) : null}
                {(selected.documents ?? []).map((doc) => (
                  <div key={doc.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{doc.type}</div>
                        <a
                          className="text-xs text-red-700 underline"
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {doc.fileUrl}
                        </a>
                      </div>
                      <StatusBadge value={doc.status} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          documentStatus(selected.id, doc.id, 'APPROVED')
                        }
                      >
                        Approve doc
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          documentStatus(selected.id, doc.id, 'REJECTED')
                        }
                      >
                        Reject doc
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <Textarea
                placeholder="Rejection reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="Commission %"
                />
                <Button onClick={() => updateCommission(selected.id)}>
                  Set commission
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => action(selected.id, 'approve')}
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => action(selected.id, 'reject')}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => action(selected.id, 'suspend')}
                >
                  <ShieldOff className="h-4 w-4" />
                  Suspend
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
