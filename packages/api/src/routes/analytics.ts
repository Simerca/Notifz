import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { prisma } from '../db';
import type { AnalyticsOverview, Condition } from '@localnotification/shared';

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

async function calculateSimpleRetention(appId: string, userIds?: string[]) {
  const day1 = getDaysAgo(1);
  const day7 = getDaysAgo(7);
  const day30 = getDaysAgo(30);

  const userFilter = userIds ? { id: { in: userIds } } : {};

  const usersFirstSeenDay1 = await prisma.user.count({
    where: {
      appId,
      ...userFilter,
      firstSeen: { gte: day1, lt: getDaysAgo(0) },
    },
  });

  const usersFirstSeenDay7 = await prisma.user.count({
    where: {
      appId,
      ...userFilter,
      firstSeen: { gte: day7, lt: getDaysAgo(6) },
    },
  });

  const usersFirstSeenDay30 = await prisma.user.count({
    where: {
      appId,
      ...userFilter,
      firstSeen: { gte: day30, lt: getDaysAgo(29) },
    },
  });

  const returnedDay1 = await prisma.session.groupBy({
    by: ['userId'],
    where: {
      appId,
      date: getDateString(new Date()),
      ...(userIds ? { userId: { in: userIds } } : {}),
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
      ...(userIds ? { userId: { in: userIds } } : {}),
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
      ...(userIds ? { userId: { in: userIds } } : {}),
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
  const segmentId = c.req.query('segmentId');

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  let segmentUserIds: string[] | undefined;
  
  if (segmentId) {
    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    if (!segment) {
      return c.json({ error: 'Segment not found' }, 404);
    }
    
    const rules: Condition[] = JSON.parse(segment.rules);
    const allUsers = await prisma.user.findMany({
      where: { appId },
    });
    
    segmentUserIds = allUsers
      .filter((user) => {
        const properties = typeof user.properties === 'string' 
          ? JSON.parse(user.properties) 
          : user.properties;
        return rules.every((rule) => evaluateCondition(rule, properties));
      })
      .map((u) => u.id);
  }

  const cohorts: {
    cohortDate: string;
    cohortSize: number;
    retention: (number | null)[];
  }[] = [];

  for (let weekIndex = weeks - 1; weekIndex >= 0; weekIndex--) {
    const cohortStartDate = getDaysAgo(weekIndex * 7 + 6);
    const cohortEndDate = getDaysAgo(weekIndex * 7);
    const cohortDateStr = getDateString(cohortStartDate);

    const cohortUsers = await prisma.user.findMany({
      where: {
        appId,
        ...(segmentUserIds ? { id: { in: segmentUserIds } } : {}),
        firstSeen: {
          gte: cohortStartDate,
          lt: new Date(cohortEndDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, firstSeen: true },
    });

    const cohortSize = cohortUsers.length;
    const retention: (number | null)[] = [];

    for (let retentionWeek = 0; retentionWeek < 8; retentionWeek++) {
      if (retentionWeek > weekIndex) {
        retention.push(null);
        continue;
      }

      if (cohortSize === 0) {
        retention.push(retentionWeek === 0 ? 100 : 0);
        continue;
      }

      if (retentionWeek === 0) {
        retention.push(100);
        continue;
      }

      const retentionWeekStart = new Date(cohortStartDate.getTime() + retentionWeek * 7 * 24 * 60 * 60 * 1000);
      const retentionWeekEnd = new Date(retentionWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const retentionStartStr = getDateString(retentionWeekStart);
      const retentionEndStr = getDateString(retentionWeekEnd);

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

// Compare retention across segments
analyticsRouter.get('/:appId/retention-comparison', async (c) => {
  const appId = c.req.param('appId');

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return c.json({ error: 'App not found' }, 404);
  }

  const segments = await prisma.segment.findMany({
    where: { appId },
    orderBy: { name: 'asc' },
  });

  const allUsers = await prisma.user.findMany({
    where: { appId },
  });

  const comparisons: {
    segmentId: string | null;
    segmentName: string;
    userCount: number;
    retention: {
      week1: number;
      week2: number;
      week4: number;
      week8: number;
    };
  }[] = [];

  // Calculate retention for all users first
  const allUserIds = allUsers.map((u) => u.id);
  const allUsersRetention = await calculateWeeklyRetention(appId, allUserIds);
  
  comparisons.push({
    segmentId: null,
    segmentName: 'All Users',
    userCount: allUsers.length,
    retention: allUsersRetention,
  });

  // Calculate retention for each segment
  for (const segment of segments) {
    const rules: Condition[] = JSON.parse(segment.rules);
    
    const segmentUsers = allUsers.filter((user) => {
      const properties = typeof user.properties === 'string' 
        ? JSON.parse(user.properties) 
        : user.properties;
      return rules.every((rule) => evaluateCondition(rule, properties));
    });

    const segmentUserIds = segmentUsers.map((u) => u.id);
    const segmentRetention = await calculateWeeklyRetention(appId, segmentUserIds);

    comparisons.push({
      segmentId: segment.id,
      segmentName: segment.name,
      userCount: segmentUsers.length,
      retention: segmentRetention,
    });
  }

  return c.json({ comparisons });
});

async function calculateWeeklyRetention(appId: string, userIds: string[]) {
  if (userIds.length === 0) {
    return { week1: 0, week2: 0, week4: 0, week8: 0 };
  }

  const calculateRetentionForWeek = async (weeksAgo: number) => {
    const cohortStart = getDaysAgo(weeksAgo * 7 + 6);
    const cohortEnd = getDaysAgo(weeksAgo * 7);

    const cohortUsers = await prisma.user.findMany({
      where: {
        appId,
        id: { in: userIds },
        firstSeen: {
          gte: cohortStart,
          lt: new Date(cohortEnd.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    if (cohortUsers.length === 0) return 0;

    const retentionStart = getDaysAgo(6);
    const retentionEnd = new Date();

    const activeUsers = await prisma.session.groupBy({
      by: ['userId'],
      where: {
        appId,
        userId: { in: cohortUsers.map((u) => u.id) },
        date: {
          gte: getDateString(retentionStart),
          lte: getDateString(retentionEnd),
        },
      },
    });

    return Math.round((activeUsers.length / cohortUsers.length) * 100);
  };

  const [week1, week2, week4, week8] = await Promise.all([
    calculateRetentionForWeek(1),
    calculateRetentionForWeek(2),
    calculateRetentionForWeek(4),
    calculateRetentionForWeek(8),
  ]);

  return { week1, week2, week4, week8 };
}

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
