import type {
  Notification,
  CreateNotificationInput,
  UpdateNotificationInput,
  Segment,
  CreateSegmentInput,
  UpdateSegmentInput,
  User,
  AnalyticsOverview,
} from '@localnotification/shared';

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

export interface UsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface SegmentUsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
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
  segments: {
    list: (appId?: string) => request<Segment[]>(`/segments${appId ? `?appId=${appId}` : ''}`),
    get: (id: string) => request<Segment>(`/segments/${id}`),
    create: (data: CreateSegmentInput) => request<Segment>('/segments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateSegmentInput) => request<Segment>(`/segments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/segments/${id}`, { method: 'DELETE' }),
    getUsers: (id: string, limit = 50, offset = 0) => request<SegmentUsersResponse>(`/segments/${id}/users?limit=${limit}&offset=${offset}`),
    getCount: (id: string) => request<{ count: number }>(`/segments/${id}/count`),
  },
  users: {
    list: (appId?: string, limit = 50, offset = 0) => request<UsersResponse>(`/users?appId=${appId}&limit=${limit}&offset=${offset}`),
    get: (appId: string, externalId: string) => request<User>(`/users/${appId}/${externalId}`),
    delete: (appId: string, externalId: string) => request<{ success: boolean }>(`/users/${appId}/${externalId}`, { method: 'DELETE' }),
  },
  analytics: {
    overview: (appId: string) => request<AnalyticsOverview>(`/analytics/${appId}/overview`),
    dau: (appId: string, days = 30) => request<{ history: { date: string; count: number }[] }>(`/analytics/${appId}/dau?days=${days}`),
    retention: (appId: string) => request<{ day1: number; day7: number; day30: number }>(`/analytics/${appId}/retention`),
    retentionCohort: (appId: string, weeks = 8, segmentId?: string) => request<{
      cohorts: {
        cohortDate: string;
        cohortSize: number;
        retention: (number | null)[];
      }[];
    }>(`/analytics/${appId}/retention-cohort?weeks=${weeks}${segmentId ? `&segmentId=${segmentId}` : ''}`),
    retentionComparison: (appId: string) => request<{
      comparisons: {
        segmentId: string | null;
        segmentName: string;
        userCount: number;
        retention: {
          week1: number;
          week2: number;
          week4: number;
          week8: number;
        };
      }[];
    }>(`/analytics/${appId}/retention-comparison`),
  },
};
