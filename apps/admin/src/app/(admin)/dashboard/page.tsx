'use client';

import { Activity, Bike, Building2, IndianRupee, ShoppingCart, Store, Users } from 'lucide-react';
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
};

type SummaryCard = {
  key: keyof Summary;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
};

const cards: SummaryCard[] = [
  { key: 'totalUsers', label: 'Total users', icon: Users },
  { key: 'shopsPending', label: 'Shops pending', icon: Building2 },
  { key: 'activeShops', label: 'Active shops', icon: Store },
  { key: 'ordersToday', label: 'Orders today', icon: ShoppingCart },
  { key: 'gmvToday', label: 'GMV today', icon: IndianRupee, money: true },
  { key: 'ridersOnline', label: 'Riders online', icon: Bike },
  { key: 'pendingItemRequests', label: 'Pending item requests', icon: Activity },
];

export default function DashboardPage() {
  const { data, loading, error } = useApi(async () => unwrap<Summary>(await api.get('/admin/dashboard/summary')), []);

  return (
    <>
      <PageHeader title="Dashboard" description="Live operational summary for RedKS admins." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const value = data[card.key];
            return (
              <Card key={card.key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{card.money ? formatCurrency(value) : value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
