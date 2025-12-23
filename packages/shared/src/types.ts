import { z } from 'zod';
import {
  NotificationSchema,
  TriggerSchema,
  ConditionSchema,
  CreateNotificationSchema,
  UpdateNotificationSchema,
  SyncResponseSchema,
  SegmentSchema,
  CreateSegmentSchema,
  UpdateSegmentSchema,
  UserSchema,
  UpsertUserSchema,
  UserPropertiesSchema,
  SessionEventSchema,
  AnalyticsOverviewSchema,
} from './schemas';

export type Trigger = z.infer<typeof TriggerSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export type Segment = z.infer<typeof SegmentSchema>;
export type CreateSegmentInput = z.infer<typeof CreateSegmentSchema>;
export type UpdateSegmentInput = z.infer<typeof UpdateSegmentSchema>;

export type User = z.infer<typeof UserSchema>;
export type UpsertUserInput = z.infer<typeof UpsertUserSchema>;
export type UserProperties = z.infer<typeof UserPropertiesSchema>;

export type SessionEvent = z.infer<typeof SessionEventSchema>;
export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;

export type TriggerType = 'immediate' | 'scheduled' | 'recurring';
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly';
export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

export interface SDKConfig {
  apiUrl: string;
  appId: string;
  apiKey?: string;
  syncInterval?: number;
  trackSessions?: boolean;
}

export interface UserContext {
  userId?: string;
  locale?: string;
  timezone?: string;
  properties?: Record<string, unknown>;
}
