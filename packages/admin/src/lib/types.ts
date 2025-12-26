export type TriggerType = 'immediate' | 'scheduled' | 'recurring';
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly';
export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

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

export interface LocalizedContent {
  title: string;
  body: string;
}

export interface Notification {
  id: string;
  appId: string;
  name: string;
  title: string;
  body: string;
  locales?: Record<string, LocalizedContent>;
  data?: Record<string, unknown>;
  trigger: Trigger;
  conditions?: Condition[];
  segmentId?: string;
  enabled: boolean;
  priority: 'low' | 'default' | 'high';
  badge?: number;
  sound?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateNotificationInput {
  appId: string;
  name: string;
  title: string;
  body: string;
  locales?: Record<string, LocalizedContent>;
  data?: Record<string, unknown>;
  trigger: Trigger;
  conditions?: Condition[];
  segmentId?: string;
  enabled?: boolean;
  priority?: 'low' | 'default' | 'high';
  badge?: number;
  sound?: string;
}

export interface UpdateNotificationInput {
  name?: string;
  title?: string;
  body?: string;
  locales?: Record<string, LocalizedContent>;
  data?: Record<string, unknown>;
  trigger?: Trigger;
  conditions?: Condition[];
  segmentId?: string;
  enabled?: boolean;
  priority?: 'low' | 'default' | 'high';
  badge?: number;
  sound?: string;
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

export interface CreateSegmentInput {
  appId: string;
  name: string;
  description?: string;
  rules: Condition[];
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  rules?: Condition[];
}

export interface User {
  id: string;
  appId: string;
  externalId: string;
  properties: Record<string, string | number | boolean>;
  firstSeen: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
  dauHistory: { date: string; count: number }[];
}

