import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export function unwrap<T>(response: { data: ApiEnvelope<T> | T }): T {
  const payload = response.data as ApiEnvelope<T>;
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : (response.data as T);
}

export function unwrapMeta<T>(response: { data: ApiEnvelope<T[]> }) {
  return {
    data: response.data.data ?? [],
    meta: response.data.meta,
  };
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
