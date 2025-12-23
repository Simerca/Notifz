import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { appsRouter } from './routes/apps';
import { notificationsRouter } from './routes/notifications';
import { syncRouter } from './routes/sync';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => c.json({ name: 'LocalNotification API', version: '1.0.0' }));

app.route('/api/apps', appsRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api/sync', syncRouter);

const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

