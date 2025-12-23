import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { prisma } from '../db';
import { CreateSegmentSchema, UpdateSegmentSchema, type Segment, type Condition } from '@localnotification/shared';

export const segmentsRouter = new Hono();

function serializeSegment(s: {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  rules: string;
  createdAt: Date;
  updatedAt: Date;
}): Segment {
  return {
    id: s.id,
    appId: s.appId,
    name: s.name,
    description: s.description ?? undefined,
    rules: JSON.parse(s.rules),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function evaluateCondition(condition: Condition, properties: Record<string, unknown>): boolean {
  const value = properties[condition.field];
  if (value === undefined) return false;

  switch (condition.operator) {
    case 'eq':
      return value === condition.value;
    case 'neq':
      return value !== condition.value;
    case 'gt':
      return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
    case 'gte':
      return typeof value === 'number' && typeof condition.value === 'number' && value >= condition.value;
    case 'lt':
      return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
    case 'lte':
      return typeof value === 'number' && typeof condition.value === 'number' && value <= condition.value;
    case 'contains':
      return typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value as string);
    default:
      return false;
  }
}

segmentsRouter.get('/', async (c) => {
  const appId = c.req.query('appId');

  const segments = await prisma.segment.findMany({
    where: appId ? { appId } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return c.json(segments.map(serializeSegment));
});

segmentsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const segment = await prisma.segment.findUnique({ where: { id } });

  if (!segment) {
    return c.json({ error: 'Segment not found' }, 404);
  }

  return c.json(serializeSegment(segment));
});

segmentsRouter.get('/:id/users', async (c) => {
  const id = c.req.param('id');
  const limit = Number(c.req.query('limit') || 50);
  const offset = Number(c.req.query('offset') || 0);

  const segment = await prisma.segment.findUnique({ where: { id } });
  if (!segment) {
    return c.json({ error: 'Segment not found' }, 404);
  }

  const rules: Condition[] = JSON.parse(segment.rules);
  const allUsers = await prisma.user.findMany({
    where: { appId: segment.appId },
    orderBy: { lastSeen: 'desc' },
  });

  const matchingUsers = allUsers.filter((user) => {
    const properties = JSON.parse(user.properties);
    return rules.every((rule) => evaluateCondition(rule, properties));
  });

  const paginatedUsers = matchingUsers.slice(offset, offset + limit);

  return c.json({
    users: paginatedUsers.map((u) => ({
      id: u.id,
      appId: u.appId,
      externalId: u.externalId,
      properties: JSON.parse(u.properties),
      firstSeen: u.firstSeen.toISOString(),
      lastSeen: u.lastSeen.toISOString(),
    })),
    total: matchingUsers.length,
    limit,
    offset,
  });
});

segmentsRouter.get('/:id/count', async (c) => {
  const id = c.req.param('id');

  const segment = await prisma.segment.findUnique({ where: { id } });
  if (!segment) {
    return c.json({ error: 'Segment not found' }, 404);
  }

  const rules: Condition[] = JSON.parse(segment.rules);
  const allUsers = await prisma.user.findMany({
    where: { appId: segment.appId },
  });

  const count = allUsers.filter((user) => {
    const properties = JSON.parse(user.properties);
    return rules.every((rule) => evaluateCondition(rule, properties));
  }).length;

  return c.json({ count });
});

segmentsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateSegmentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const app = await prisma.app.findUnique({ where: { id: parsed.data.appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  const segment = await prisma.segment.create({
    data: {
      id: nanoid(),
      appId: parsed.data.appId,
      name: parsed.data.name,
      description: parsed.data.description,
      rules: JSON.stringify(parsed.data.rules),
    },
  });

  return c.json(serializeSegment(segment), 201);
});

segmentsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateSegmentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const existing = await prisma.segment.findUnique({ where: { id } });
  if (!existing) {
    return c.json({ error: 'Segment not found' }, 404);
  }

  const segment = await prisma.segment.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      rules: parsed.data.rules ? JSON.stringify(parsed.data.rules) : undefined,
    },
  });

  return c.json(serializeSegment(segment));
});

segmentsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.segment.delete({ where: { id } });
  return c.json({ success: true });
});

