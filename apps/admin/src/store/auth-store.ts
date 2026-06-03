'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminUser = {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  roles: string[];
  status: string;
};

type AuthState = {
  accessToken?: string;
  refreshToken?: string;
  user?: AdminUser;
  setSession: (session: { accessToken: string; refreshToken?: string; user: AdminUser }) => void;
  setUser: (user: AdminUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      setSession: (session) => set(session),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: undefined, refreshToken: undefined, user: undefined }),
    }),
    {
      name: 'redks-admin-auth',
    },
  ),
);
