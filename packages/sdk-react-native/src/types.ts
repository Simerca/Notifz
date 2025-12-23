// SDK Types - standalone types for npm publishing

export type TriggerType = 'immediate' | 'scheduled' | 'recurring';
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly';
export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
export type Priority = 'low' | 'default' | 'high';

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

export interface Recurrence {
  interval: RecurrenceInterval;
  time: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface Trigger {
  type: TriggerType;
  scheduledAt?: string;
  recurrence?: Recurrence;
}

export interface Notification {
  id: string;
  appId: string;
  name: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger: Trigger;
  conditions?: Condition[];
  segmentId?: string;
  enabled: boolean;
  priority: Priority;
  badge?: number;
  sound?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Segment {
  id: string;
  appId: string;
  name: string;
  description?: string;
  rules: Condition[];
  createdAt: string;
  updatedAt: string;
}

export interface SegmentInfo {
  id: string;
  name: string;
  rules: Condition[];
}

export interface SyncResponse {
  notifications: Notification[];
  segments: SegmentInfo[];
  serverTime: string;
  version: number;
}

export type UserProperties = Record<string, string | number | boolean>;

export interface UserContext {
  userId?: string;
  locale?: string;
  timezone?: string;
  properties?: UserProperties;
}

export interface SDKConfig {
  apiUrl: string;
  appId: string;
  apiKey?: string;
  syncInterval?: number;
  trackSessions?: boolean;
}

