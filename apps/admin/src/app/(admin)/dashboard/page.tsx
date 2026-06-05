'use client';

import { Bike, Building2, IndianRupee, ShoppingCart, Store, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/state-view';
import { PageHeader } from '@/components/page-header';
import { api, unwrap } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';

type Summary = {
  totalUsers: number;
  shopsPending: number;
  activeShops: number;
  ordersToday: number;
  gmvToday: number;
  ridersOnline: number;
  pendingItemRequests: number;
  pendingRiderApprovals?: number;
};

type SummaryCard = {
  key: keyof Summary;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
};

const cards: SummaryCard[] = [
  { key: 'ordersToday', label: 'Orders Today', icon: ShoppingCart },
  { key: 'gmvToday', label: 'Revenue Today', icon: IndianRupee, money: true },
  { key: 'activeShops', label: 'Active Shops', icon: Store },
  { key: 'ridersOnline', label: 'Active Riders', icon: Bike },
  { key: 'shopsPending', label: 'Pending Shop Approvals', icon: Building2 },
  { key: 'pendingRiderApprovals', label: 'Pending Rider Approvals', icon: UserCheck },
];

export default function DashboardPage() {
  const { data, loading, error } = useApi(async () => unwrap<Summary>(await api.get('/admin/dashboard/summary')), []);

  return (
    <>
      <PageHeader title="Dashboard" description="Live operational summary for RedKS admins." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const value = data[card.key] ?? 0;
            return (
              <Card key={card.key} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground">{card.label}</CardTitle>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-slate-950">{card.money ? formatCurrency(value) : value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
