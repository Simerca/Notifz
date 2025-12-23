import type { Notification, CreateNotificationInput, UpdateNotificationInput } from '@localnotification/shared';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export interface App {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  apps: {
    list: () => request<App[]>('/apps'),
    get: (id: string) => request<App>(`/apps/${id}`),
    create: (data: { name: string }) => request<App>('/apps', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name: string }) => request<App>(`/apps/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/apps/${id}`, { method: 'DELETE' }),
    regenerateKey: (id: string) => request<App>(`/apps/${id}/regenerate-key`, { method: 'POST' }),
  },
  notifications: {
    list: (appId?: string) => request<Notification[]>(`/notifications${appId ? `?appId=${appId}` : ''}`),
    get: (id: string) => request<Notification>(`/notifications/${id}`),
    create: (data: CreateNotificationInput) => request<Notification>('/notifications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateNotificationInput) => request<Notification>(`/notifications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
    toggle: (id: string) => request<Notification>(`/notifications/${id}/toggle`, { method: 'POST' }),
    duplicate: (id: string) => request<Notification>(`/notifications/${id}/duplicate`, { method: 'POST' }),
  },
};

