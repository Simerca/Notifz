import { Hono } from 'hono';
import { prisma } from '../db';
import type { SyncResponse, Notification } from '@localnotification/shared';

export const syncRouter = new Hono();

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

syncRouter.get('/:appId', async (c) => {
  const appId = c.req.param('appId');
  const apiKey = c.req.header('X-API-Key');

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  if (apiKey && app.apiKey !== apiKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const notifications = await prisma.notification.findMany({
    where: { appId, enabled: true },
    orderBy: { createdAt: 'desc' },
  });

  const maxVersion = notifications.reduce((max, n) => Math.max(max, n.version), 0);

  const response: SyncResponse = {
    notifications: notifications.map(serializeNotification),
    serverTime: new Date().toISOString(),
    version: maxVersion,
  };

  return c.json(response);
});

syncRouter.get('/:appId/delta', async (c) => {
  const appId = c.req.param('appId');
  const sinceVersion = Number(c.req.query('since') || 0);
  const apiKey = c.req.header('X-API-Key');

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  if (apiKey && app.apiKey !== apiKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const notifications = await prisma.notification.findMany({
    where: {
      appId,
      enabled: true,
      version: { gt: sinceVersion },
    },
    orderBy: { createdAt: 'desc' },
  });

  const maxVersion = notifications.reduce((max, n) => Math.max(max, n.version), sinceVersion);

  const response: SyncResponse = {
    notifications: notifications.map(serializeNotification),
    serverTime: new Date().toISOString(),
    version: maxVersion,
  };

  return c.json(response);
});

