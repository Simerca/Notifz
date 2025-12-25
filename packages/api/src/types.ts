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
  segmentId: z.string().optional(),
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
  segments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    rules: z.array(ConditionSchema),
  })),
  serverTime: z.string().datetime(),
  version: z.number(),
});

export const SegmentRuleSchema = ConditionSchema;

export const SegmentSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(SegmentRuleSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateSegmentSchema = SegmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateSegmentSchema = SegmentSchema.partial().omit({
  id: true,
  appId: true,
  createdAt: true,
  updatedAt: true,
});

export const UserPropertiesSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export const UserSchema = z.object({
  id: z.string(),
  appId: z.string(),
  externalId: z.string(),
  properties: UserPropertiesSchema,
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UpsertUserSchema = z.object({
  externalId: z.string(),
  properties: UserPropertiesSchema,
});

export const AnalyticsOverviewSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.object({
    daily: z.number(),
    weekly: z.number(),
    monthly: z.number(),
  }),
  retention: z.object({
    day1: z.number(),
    day7: z.number(),
    day30: z.number(),
  }),
  dauHistory: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
});

export type Condition = z.infer<typeof ConditionSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type SyncResponse = z.infer<typeof SyncResponseSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type User = z.infer<typeof UserSchema>;
export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;

