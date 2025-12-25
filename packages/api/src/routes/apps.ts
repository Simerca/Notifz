import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { prisma } from '../db';

export const appsRouter = new Hono();

appsRouter.get('/', async (c) => {
  const apps = await prisma.app.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return c.json(apps);
});

appsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const app = await prisma.app.findUnique({ where: { id } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }
  return c.json(app);
});

appsRouter.post('/', async (c) => {
  const body = await c.req.json<{ name: string }>();
  const app = await prisma.app.create({
    data: {
      id: nanoid(),
      name: body.name,
      apiKey: `lnk_${nanoid(32)}`,
    },
  });
  return c.json(app, 201);
});

appsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ name?: string }>();
  const app = await prisma.app.update({
    where: { id },
    data: { name: body.name },
  });
  return c.json(app);
});

appsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.app.delete({ where: { id } });
  return c.json({ success: true });
});

appsRouter.post('/:id/regenerate-key', async (c) => {
  const id = c.req.param('id');
  const app = await prisma.app.update({
    where: { id },
    data: { apiKey: `lnk_${nanoid(32)}` },
  });
  return c.json(app);
});


