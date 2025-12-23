import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { prisma } from '../db';
import type { AnalyticsOverview } from '@localnotification/shared';

export const analyticsRouter = new Hono();

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDateFromString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

analyticsRouter.get('/:appId/overview', async (c) => {
  const appId = c.req.param('appId');

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  const now = new Date();
  const today = getDateString(now);
  const day7Ago = getDateString(getDaysAgo(7));
  const day30Ago = getDateString(getDaysAgo(30));

  const [totalUsers, dauToday, dauWeek, dauMonth] = await Promise.all([
    prisma.user.count({ where: { appId } }),
    prisma.session.groupBy({
      by: ['userId'],
      where: { appId, date: today },
    }),
    prisma.session.groupBy({
      by: ['userId'],
      where: { appId, date: { gte: day7Ago } },
    }),
    prisma.session.groupBy({
      by: ['userId'],
      where: { appId, date: { gte: day30Ago } },
    }),
  ]);

  const retention = await calculateSimpleRetention(appId);
  const dauHistory = await getDauHistory(appId, 30);

  const response: AnalyticsOverview = {
    totalUsers,
    activeUsers: {
      daily: dauToday.length,
      weekly: dauWeek.length,
      monthly: dauMonth.length,
    },
    retention,
    dauHistory,
  };

  return c.json(response);
});

async function calculateSimpleRetention(appId: string) {
  const day1 = getDaysAgo(1);
  const day7 = getDaysAgo(7);
  const day30 = getDaysAgo(30);

  const usersFirstSeenDay1 = await prisma.user.count({
    where: {
      appId,
      firstSeen: { gte: day1, lt: getDaysAgo(0) },
    },
  });

  const usersFirstSeenDay7 = await prisma.user.count({
    where: {
      appId,
      firstSeen: { gte: day7, lt: getDaysAgo(6) },
    },
  });

  const usersFirstSeenDay30 = await prisma.user.count({
    where: {
      appId,
      firstSeen: { gte: day30, lt: getDaysAgo(29) },
    },
  });

  const returnedDay1 = await prisma.session.groupBy({
    by: ['userId'],
    where: {
      appId,
      date: getDateString(new Date()),
      user: {
        firstSeen: { gte: day1, lt: getDaysAgo(0) },
      },
    },
  });

  const returnedDay7 = await prisma.session.groupBy({
    by: ['userId'],
    where: {
      appId,
      date: { gte: getDateString(getDaysAgo(1)) },
      user: {
        firstSeen: { gte: day7, lt: getDaysAgo(6) },
      },
    },
  });

  const returnedDay30 = await prisma.session.groupBy({
    by: ['userId'],
    where: {
      appId,
      date: { gte: getDateString(getDaysAgo(7)) },
      user: {
        firstSeen: { gte: day30, lt: getDaysAgo(29) },
      },
    },
  });

  return {
    day1: usersFirstSeenDay1 > 0 ? Math.round((returnedDay1.length / usersFirstSeenDay1) * 100) : 0,
    day7: usersFirstSeenDay7 > 0 ? Math.round((returnedDay7.length / usersFirstSeenDay7) * 100) : 0,
    day30: usersFirstSeenDay30 > 0 ? Math.round((returnedDay30.length / usersFirstSeenDay30) * 100) : 0,
  };
}

async function getDauHistory(appId: string, days: number) {
  const history: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = getDateString(getDaysAgo(i));
    const sessions = await prisma.session.groupBy({
      by: ['userId'],
      where: { appId, date },
    });
    history.push({ date, count: sessions.length });
  }

  return history;
}

// Retention cohort table endpoint
analyticsRouter.get('/:appId/retention-cohort', async (c) => {
  const appId = c.req.param('appId');
  const weeks = Number(c.req.query('weeks') || 8);

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  const cohorts: {
    cohortDate: string;
    cohortSize: number;
    retention: (number | null)[];
  }[] = [];

  // Generate cohorts for each week
  for (let weekIndex = weeks - 1; weekIndex >= 0; weekIndex--) {
    const cohortStartDate = getDaysAgo(weekIndex * 7 + 6);
    const cohortEndDate = getDaysAgo(weekIndex * 7);
    const cohortDateStr = getDateString(cohortStartDate);

    // Get users who first appeared in this cohort week
    const cohortUsers = await prisma.user.findMany({
      where: {
        appId,
        firstSeen: {
          gte: cohortStartDate,
          lt: new Date(cohortEndDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, firstSeen: true },
    });

    const cohortSize = cohortUsers.length;
    const retention: (number | null)[] = [];

    // Calculate retention for each subsequent week
    const maxWeeksToTrack = Math.min(8, weekIndex + 1);
    
    for (let retentionWeek = 0; retentionWeek < 8; retentionWeek++) {
      if (retentionWeek > weekIndex) {
        // Future week, no data yet
        retention.push(null);
        continue;
      }

      if (cohortSize === 0) {
        retention.push(retentionWeek === 0 ? 100 : 0);
        continue;
      }

      if (retentionWeek === 0) {
        // Week 0 is always 100%
        retention.push(100);
        continue;
      }

      // Calculate the date range for this retention week
      const retentionWeekStart = new Date(cohortStartDate.getTime() + retentionWeek * 7 * 24 * 60 * 60 * 1000);
      const retentionWeekEnd = new Date(retentionWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const retentionStartStr = getDateString(retentionWeekStart);
      const retentionEndStr = getDateString(retentionWeekEnd);

      // Count users from this cohort who had sessions in the retention week
      const userIds = cohortUsers.map(u => u.id);
      
      const activeUsers = await prisma.session.groupBy({
        by: ['userId'],
        where: {
          appId,
          userId: { in: userIds },
          date: {
            gte: retentionStartStr,
            lt: retentionEndStr,
          },
        },
      });

      const retentionRate = Math.round((activeUsers.length / cohortSize) * 100);
      retention.push(retentionRate);
    }

    cohorts.push({
      cohortDate: cohortDateStr,
      cohortSize,
      retention,
    });
  }

  return c.json({ cohorts });
});

analyticsRouter.post('/:appId/session', async (c) => {
  const appId = c.req.param('appId');
  const apiKey = c.req.header('X-API-Key');
  const body = await c.req.json<{
    userId: string;
    type: 'start' | 'end';
    sessionId?: string;
    timestamp?: string;
  }>();

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  if (apiKey && app.apiKey !== apiKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const user = await prisma.user.findUnique({
    where: { appId_externalId: { appId, externalId: body.userId } },
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const now = new Date(body.timestamp || Date.now());
  const date = getDateString(now);

  if (body.type === 'start') {
    const sessionId = nanoid();
    await prisma.session.create({
      data: {
        id: sessionId,
        appId,
        userId: user.id,
        startedAt: now,
        date,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: now },
    });

    return c.json({ sessionId });
  }

  if (body.type === 'end' && body.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: body.sessionId },
    });

    if (session) {
      const duration = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
      await prisma.session.update({
        where: { id: body.sessionId },
        data: { endedAt: now, duration },
      });
    }

    return c.json({ success: true });
  }

  return c.json({ error: 'Invalid request' }, 400);
});

analyticsRouter.get('/:appId/dau', async (c) => {
  const appId = c.req.param('appId');
  const days = Number(c.req.query('days') || 30);

  const history = await getDauHistory(appId, days);
  return c.json({ history });
});

analyticsRouter.get('/:appId/retention', async (c) => {
  const appId = c.req.param('appId');
  const retention = await calculateSimpleRetention(appId);
  return c.json(retention);
});
