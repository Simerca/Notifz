import { z } from 'zod';
import {
  NotificationSchema,
  TriggerSchema,
  ConditionSchema,
  CreateNotificationSchema,
  UpdateNotificationSchema,
  SyncResponseSchema,
} from './schemas';

export type Trigger = z.infer<typeof TriggerSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export type TriggerType = 'immediate' | 'scheduled' | 'recurring';
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly';
export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

export interface SDKConfig {
  apiUrl: string;
  appId: string;
  apiKey?: string;
  syncInterval?: number;
}

export interface UserContext {
  userId?: string;
  locale?: string;
  timezone?: string;
  properties?: Record<string, unknown>;
}

