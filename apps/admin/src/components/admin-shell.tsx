'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bike,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  ListTree,
  LogOut,
  Map,
  Menu,
  PackageSearch,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shops', label: 'Shops', icon: Building2 },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/riders', label: 'Riders', icon: Bike },
  { href: '/categories', label: 'Categories', icon: ListTree },
  { href: '/locations', label: 'Cities & Zones', icon: Map },
  { href: '/products', label: 'Products', icon: Boxes },
  { href: '/item-requests', label: 'Item Requests', icon: PackageSearch },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  useEffect(() => {
    setOnline(window.navigator.onLine);
    const update = () => setOnline(window.navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!accessToken) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-900 bg-[#111827] text-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-red-950/30">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold">RedKS</div>
            <div className="text-xs text-slate-300">Har Dukaan, Ghar Tak.</div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white',
                  active && 'bg-primary text-white shadow-sm shadow-red-950/30',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open ? <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <div className="text-sm font-bold text-slate-900">Admin Panel</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
                {online ? 'Connected' : 'Offline'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-medium">{user?.name ?? user?.phone ?? 'Admin'}</div>
              <div className="text-xs text-muted-foreground">{user?.roles?.join(', ')}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmLogout(true)}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      <ConfirmDialog
        open={confirmLogout}
        title="Sign out"
        description="You will need to verify OTP again to access the admin panel."
        confirmLabel="Sign out"
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          logout();
          router.replace('/login');
        }}
      />
    </div>
  );
}
