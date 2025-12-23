import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { prisma } from '../db';
import { UpsertUserSchema, type User } from '@localnotification/shared';

export const usersRouter = new Hono();

function serializeUser(u: {
  id: string;
  appId: string;
  externalId: string;
  properties: string;
  firstSeen: Date;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: u.id,
    appId: u.appId,
    externalId: u.externalId,
    properties: JSON.parse(u.properties),
    firstSeen: u.firstSeen.toISOString(),
    lastSeen: u.lastSeen.toISOString(),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

usersRouter.get('/', async (c) => {
  const appId = c.req.query('appId');
  const search = c.req.query('search');
  const limit = Number(c.req.query('limit') || 50);
  const offset = Number(c.req.query('offset') || 0);

  const where: { appId?: string; externalId?: { contains: string } } = {};
  if (appId) where.appId = appId;
  if (search) where.externalId = { contains: search };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { lastSeen: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);

  return c.json({
    users: users.map(serializeUser),
    total,
    limit,
    offset,
  });
});

usersRouter.get('/:appId/:externalId', async (c) => {
  const appId = c.req.param('appId');
  const externalId = c.req.param('externalId');

  const user = await prisma.user.findUnique({
    where: { appId_externalId: { appId, externalId } },
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(serializeUser(user));
});

usersRouter.post('/:appId', async (c) => {
  const appId = c.req.param('appId');
  const body = await c.req.json();
  const parsed = UpsertUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  const user = await prisma.user.upsert({
    where: { appId_externalId: { appId, externalId: parsed.data.externalId } },
    create: {
      id: nanoid(),
      appId,
      externalId: parsed.data.externalId,
      properties: JSON.stringify(parsed.data.properties),
    },
    update: {
      properties: JSON.stringify(parsed.data.properties),
      lastSeen: new Date(),
    },
  });

  return c.json(serializeUser(user));
});

usersRouter.delete('/:appId/:externalId', async (c) => {
  const appId = c.req.param('appId');
  const externalId = c.req.param('externalId');

  await prisma.user.delete({
    where: { appId_externalId: { appId, externalId } },
  });

  return c.json({ success: true });
});

