'use client';

import { FormEvent, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/state-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, getErrorMessage, unwrap } from '@/lib/api';
import { City, Zone } from '@/types/api';
import { useApi } from '@/hooks/use-api';

export default function LocationsPage() {
  const { data: cities, loading, error, reload } = useApi(async () => unwrap<City[]>(await api.get('/cities')), []);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [cityName, setCityName] = useState('');
  const [stateName, setStateName] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('30');
  const [formError, setFormError] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [cityEdit, setCityEdit] = useState({ name: '', state: '', isActive: true });
  const [zoneEdit, setZoneEdit] = useState({ name: '', baseDeliveryFee: '30', isActive: true });

  const selectedCity = cities?.find((city) => city.id === selectedCityId) ?? cities?.[0];
  const zones: Zone[] = selectedCity?.zones ?? [];

  async function createCity(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await api.post('/cities', { name: cityName, state: stateName });
      setCityName('');
      setStateName('');
      await reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function createZone(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await api.post('/zones', { cityId: selectedCity?.id, name: zoneName, baseDeliveryFee: Number(deliveryFee) });
      setZoneName('');
      await reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function deactivateCity(id: string) {
    await api.delete(`/cities/${id}`);
    await reload();
  }

  async function deactivateZone(id: string) {
    await api.delete(`/zones/${id}`);
    await reload();
  }

  function openCity(city: City) {
    setEditingCity(city);
    setCityEdit({ name: city.name, state: city.state, isActive: city.isActive });
  }

  function openZone(zone: Zone) {
    setEditingZone(zone);
    setZoneEdit({ name: zone.name, baseDeliveryFee: String(zone.baseDeliveryFee ?? 30), isActive: zone.isActive });
  }

  async function saveCity() {
    if (!editingCity) return;
    await api.patch(`/cities/${editingCity.id}`, cityEdit);
    setEditingCity(null);
    await reload();
  }

  async function saveZone() {
    if (!editingZone) return;
    await api.patch(`/zones/${editingZone.id}`, {
      name: zoneEdit.name,
      baseDeliveryFee: Number(zoneEdit.baseDeliveryFee),
      isActive: zoneEdit.isActive,
    });
    setEditingZone(null);
    await reload();
  }

  return (
    <>
      <PageHeader title="Cities & Zones" description="Configure serviceable cities, zones, and delivery fee defaults." />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />New city</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createCity} className="space-y-3">
                <Input placeholder="City" value={cityName} onChange={(e) => setCityName(e.target.value)} />
                <Input placeholder="State" value={stateName} onChange={(e) => setStateName(e.target.value)} />
                <Button disabled={!cityName || !stateName}><Save className="h-4 w-4" />Create city</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />New zone</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createZone} className="space-y-3">
                <Select value={selectedCity?.id ?? ''} onChange={(e) => setSelectedCityId(e.target.value)}>
                  {cities?.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </Select>
                <Input placeholder="Zone" value={zoneName} onChange={(e) => setZoneName(e.target.value)} />
                <Input type="number" placeholder="Delivery fee" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
                <Button disabled={!selectedCity || !zoneName}><Save className="h-4 w-4" />Create zone</Button>
              </form>
            </CardContent>
          </Card>
          {formError ? <ErrorState message={formError} /> : null}
        </div>
        <div className="space-y-4">
          {loading ? <LoadingState /> : null}
          {error ? <ErrorState message={error} /> : null}
          {cities ? (
            <DataTable
              rows={cities}
              columns={[
                { key: 'city', header: 'City', render: (row) => <button className="font-medium text-primary" onClick={() => { setSelectedCityId(row.id); openCity(row); }}>{row.name}</button> },
                { key: 'state', header: 'State', render: (row) => row.state },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                { key: 'zones', header: 'Zones', render: (row) => row.zones?.length ?? 0 },
                { key: 'actions', header: 'Actions', render: (row) => <Button size="sm" variant="outline" onClick={() => deactivateCity(row.id)}><Trash2 className="h-3 w-3" />Deactivate</Button> },
              ]}
            />
          ) : null}
          <Card>
            <CardHeader><CardTitle>{selectedCity?.name ?? 'City'} zones</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                rows={zones}
                columns={[
                  { key: 'zone', header: 'Zone', render: (row) => <button className="font-medium text-primary" onClick={() => openZone(row)}>{row.name}</button> },
                  { key: 'fee', header: 'Delivery fee', render: (row) => row.baseDeliveryFee ?? '-' },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                  { key: 'actions', header: 'Actions', render: (row) => <Button size="sm" variant="outline" onClick={() => deactivateZone(row.id)}><Trash2 className="h-3 w-3" />Deactivate</Button> },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Modal title="Edit city" open={!!editingCity} onClose={() => setEditingCity(null)}>
        <div className="space-y-3">
          <Input value={cityEdit.name} onChange={(e) => setCityEdit({ ...cityEdit, name: e.target.value })} />
          <Input value={cityEdit.state} onChange={(e) => setCityEdit({ ...cityEdit, state: e.target.value })} />
          <Select value={cityEdit.isActive ? 'true' : 'false'} onChange={(e) => setCityEdit({ ...cityEdit, isActive: e.target.value === 'true' })}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingCity(null)}>Cancel</Button>
            <Button onClick={saveCity}>Save city</Button>
          </div>
        </div>
      </Modal>
      <Modal title="Edit zone" open={!!editingZone} onClose={() => setEditingZone(null)}>
        <div className="space-y-3">
          <Input value={zoneEdit.name} onChange={(e) => setZoneEdit({ ...zoneEdit, name: e.target.value })} />
          <Input type="number" value={zoneEdit.baseDeliveryFee} onChange={(e) => setZoneEdit({ ...zoneEdit, baseDeliveryFee: e.target.value })} />
          <Select value={zoneEdit.isActive ? 'true' : 'false'} onChange={(e) => setZoneEdit({ ...zoneEdit, isActive: e.target.value === 'true' })}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingZone(null)}>Cancel</Button>
            <Button onClick={saveZone}>Save zone</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
