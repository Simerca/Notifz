import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { prisma } from '../db';
import { CreateNotificationSchema, UpdateNotificationSchema, type Notification } from '@localnotification/shared';

export const notificationsRouter = new Hono();

function serializeNotification(n: {
  id: string;
  appId: string;
  name: string;
  title: string;
  body: string;
  data: string | null;
  trigger: string;
  conditions: string | null;
  enabled: boolean;
  priority: string;
  badge: number | null;
  sound: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}): Notification {
  return {
    id: n.id,
    appId: n.appId,
    name: n.name,
    title: n.title,
    body: n.body,
    data: n.data ? JSON.parse(n.data) : undefined,
    trigger: JSON.parse(n.trigger),
    conditions: n.conditions ? JSON.parse(n.conditions) : undefined,
    enabled: n.enabled,
    priority: n.priority as 'low' | 'default' | 'high',
    badge: n.badge ?? undefined,
    sound: n.sound ?? undefined,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    version: n.version,
  };
}

notificationsRouter.get('/', async (c) => {
  const appId = c.req.query('appId');
  const notifications = await prisma.notification.findMany({
    where: appId ? { appId } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return c.json(notifications.map(serializeNotification));
});

notificationsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return c.json({ error: 'Notification not found' }, 404);
  }
  return c.json(serializeNotification(notification));
});

notificationsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const app = await prisma.app.findUnique({ where: { id: parsed.data.appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  const notification = await prisma.notification.create({
    data: {
      id: nanoid(),
      appId: parsed.data.appId,
      name: parsed.data.name,
      title: parsed.data.title,
      body: parsed.data.body,
      data: parsed.data.data ? JSON.stringify(parsed.data.data) : null,
      trigger: JSON.stringify(parsed.data.trigger),
      conditions: parsed.data.conditions ? JSON.stringify(parsed.data.conditions) : null,
      enabled: parsed.data.enabled,
      priority: parsed.data.priority,
      badge: parsed.data.badge,
      sound: parsed.data.sound,
    },
  });

  return c.json(serializeNotification(notification), 201);
});

notificationsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: {
      name: parsed.data.name,
      title: parsed.data.title,
      body: parsed.data.body,
      data: parsed.data.data !== undefined ? JSON.stringify(parsed.data.data) : undefined,
      trigger: parsed.data.trigger ? JSON.stringify(parsed.data.trigger) : undefined,
      conditions: parsed.data.conditions !== undefined ? JSON.stringify(parsed.data.conditions) : undefined,
      enabled: parsed.data.enabled,
      priority: parsed.data.priority,
      badge: parsed.data.badge,
      sound: parsed.data.sound,
      version: { increment: 1 },
    },
  });

  return c.json(serializeNotification(notification));
});

notificationsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.notification.delete({ where: { id } });
  return c.json({ success: true });
});

notificationsRouter.post('/:id/toggle', async (c) => {
  const id = c.req.param('id');
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      enabled: !notification.enabled,
      version: { increment: 1 },
    },
  });

  return c.json(serializeNotification(updated));
});

notificationsRouter.post('/:id/duplicate', async (c) => {
  const id = c.req.param('id');
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  const duplicate = await prisma.notification.create({
    data: {
      id: nanoid(),
      appId: notification.appId,
      name: `${notification.name} (copy)`,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      trigger: notification.trigger,
      conditions: notification.conditions,
      enabled: false,
      priority: notification.priority,
      badge: notification.badge,
      sound: notification.sound,
    },
  });

  return c.json(serializeNotification(duplicate), 201);
});

