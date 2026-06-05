'use client';

import { useState } from 'react';
import { Check, Eye, FileWarning, Search, ShieldOff, X } from 'lucide-react';
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
import { Rider } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function RidersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Rider | null>(null);
  const [reason, setReason] = useState('');
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

  async function loadRider(id: string) {
    const rider = unwrap<Rider>(await api.get(`/admin/riders/${id}`));
    setSelected(rider);
    setReason(rider.rejectionReason ?? '');
  }

  async function updateStatus(
    id: string,
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'CHANGES_REQUESTED',
  ) {
    const endpoint =
      nextStatus === 'APPROVED'
        ? 'approve'
        : nextStatus === 'SUSPENDED'
          ? 'suspend'
          : nextStatus === 'CHANGES_REQUESTED'
            ? 'request-changes'
            : 'reject';
    await api.patch(`/admin/riders/${id}/${endpoint}`, {
      status: nextStatus,
      rejectionReason:
        nextStatus === 'REJECTED' || nextStatus === 'CHANGES_REQUESTED'
          ? reason || 'Actioned from admin panel'
          : undefined,
      reviewNotes: reason || undefined,
    });
    await reload();
    if (selected?.id === id) await loadRider(id);
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
          <option value="SUBMITTED">Submitted</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="CHANGES_REQUESTED">Changes requested</option>
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
            { key: 'rider', header: 'Rider', render: (row) => <div><div className="font-medium">{row.fullName ?? row.user?.name ?? '-'}</div><div className="text-xs text-muted-foreground">{row.phone ?? row.user?.phone ?? '-'}</div></div> },
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
                  <Button size="sm" variant="outline" onClick={() => loadRider(row.id)}><Eye className="h-3 w-3" />View</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, 'APPROVED')}><Check className="h-3 w-3" />Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, 'CHANGES_REQUESTED')}><FileWarning className="h-3 w-3" />Changes</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, 'REJECTED')}><X className="h-3 w-3" />Reject</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(row.id, 'SUSPENDED')}><ShieldOff className="h-3 w-3" />Suspend</Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}
      <PaginationControls meta={data?.meta} onPageChange={setPage} />
      <Modal title="Rider Verification" open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-5">
            <section className="grid gap-3 md:grid-cols-2">
              <Info label="Name" value={selected.fullName ?? selected.user?.name ?? '-'} />
              <Info label="Phone" value={selected.phone ?? selected.user?.phone ?? '-'} />
              <Info label="Email" value={selected.email ?? selected.user?.email ?? '-'} />
              <Info label="Zone" value={`${selected.city?.name ?? '-'} / ${selected.zone?.name ?? '-'}`} />
              <Info label="Vehicle" value={`${selected.vehicleType ?? '-'} / ${selected.vehicleNumber ?? '-'}`} />
              <Info label="UPI" value={selected.upiId ?? '-'} />
              <Info label="Emergency" value={`${selected.emergencyName ?? '-'} / ${selected.emergencyPhone ?? '-'}`} />
              <Info label="Bank" value={selected.bankAccount ?? '-'} />
            </section>
            <section>
              <h3 className="mb-2 font-semibold">Photos</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <PhotoPreview label="Profile photo" url={selected.profilePhotoUrl} />
                <PhotoPreview label="Selfie" url={selected.selfieUrl} />
              </div>
            </section>
            <section>
              <h3 className="mb-2 font-semibold">Documents</h3>
              <div className="space-y-2">
                {(selected.verificationDocuments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                ) : null}
                {(selected.verificationDocuments ?? []).map((doc) => (
                  <div key={doc.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{doc.type}</div>
                        <a className="text-xs text-red-700 underline" href={doc.fileUrl} target="_blank" rel="noreferrer">{doc.fileUrl}</a>
                      </div>
                      <StatusBadge value={doc.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <Textarea placeholder="Review notes or rejection reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => updateStatus(selected.id, 'APPROVED')}><Check className="h-4 w-4" />Approve</Button>
              <Button variant="outline" onClick={() => updateStatus(selected.id, 'CHANGES_REQUESTED')}><FileWarning className="h-4 w-4" />Request changes</Button>
              <Button variant="outline" onClick={() => updateStatus(selected.id, 'REJECTED')}><X className="h-4 w-4" />Reject</Button>
              <Button variant="destructive" onClick={() => updateStatus(selected.id, 'SUSPENDED')}><ShieldOff className="h-4 w-4" />Suspend</Button>
            </div>
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

function PhotoPreview({ label, url }: { label: string; url?: string | null }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mt-2 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-32 w-full rounded-md object-cover" />
        </a>
      ) : (
        <div className="mt-2 flex h-32 items-center justify-center rounded-md bg-slate-50 text-sm text-muted-foreground">Not uploaded</div>
      )}
    </div>
  );
}
