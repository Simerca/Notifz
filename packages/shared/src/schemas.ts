import { z } from 'zod';

export const ConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export const TriggerSchema = z.object({
  type: z.enum(['immediate', 'scheduled', 'recurring']),
  scheduledAt: z.string().datetime().optional(),
  recurrence: z
    .object({
      interval: z.enum(['daily', 'weekly', 'monthly']),
      time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
    })
    .optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
  trigger: TriggerSchema,
  conditions: z.array(ConditionSchema).optional(),
  enabled: z.boolean(),
  priority: z.enum(['low', 'default', 'high']).default('default'),
  badge: z.number().optional(),
  sound: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number(),
});

export const CreateNotificationSchema = NotificationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

export const UpdateNotificationSchema = NotificationSchema.partial().omit({
  id: true,
  appId: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

export const SyncResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  serverTime: z.string().datetime(),
  version: z.number(),
});

export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

