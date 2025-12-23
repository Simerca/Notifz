import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { appsRouter } from './routes/apps';
import { notificationsRouter } from './routes/notifications';
import { syncRouter } from './routes/sync';
import { usersRouter } from './routes/users';
import { segmentsRouter } from './routes/segments';
import { analyticsRouter } from './routes/analytics';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => c.json({ name: 'LocalNotification API', version: '2.0.0' }));

app.route('/api/apps', appsRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api/sync', syncRouter);
app.route('/api/users', usersRouter);
app.route('/api/segments', segmentsRouter);
app.route('/api/analytics', analyticsRouter);

const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
