import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Users, UserCheck, TrendingUp, BarChart3, Table } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const params = useParams<{ appId: string }>();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', params.appId],
    queryFn: () => api.analytics.overview(params.appId!),
    enabled: !!params.appId,
    refetchInterval: 30000,
  });

  const { data: retentionData } = useQuery({
    queryKey: ['retention-cohort', params.appId],
    queryFn: () => api.analytics.retentionCohort(params.appId!, 8),
    enabled: !!params.appId,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const maxDau = Math.max(...(overview?.dauHistory.map((d) => d.count) || [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Monitor user engagement and retention</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={overview?.totalUsers ?? 0}
          icon={Users}
          description="All time users"
        />
        <MetricCard
          title="DAU"
          value={overview?.activeUsers.daily ?? 0}
          icon={UserCheck}
          description="Daily active users"
        />
        <MetricCard
          title="WAU"
          value={overview?.activeUsers.weekly ?? 0}
          icon={UserCheck}
          description="Weekly active users"
        />
        <MetricCard
          title="MAU"
          value={overview?.activeUsers.monthly ?? 0}
          icon={UserCheck}
          description="Monthly active users"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            Retention Cohorts
          </CardTitle>
          <CardDescription>Weekly cohort retention analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <RetentionTable cohorts={retentionData?.cohorts ?? []} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Retention
            </CardTitle>
            <CardDescription>Summary retention rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <RetentionBar label="Day 1" value={overview?.retention.day1 ?? 0} />
              <RetentionBar label="Day 7" value={overview?.retention.day7 ?? 0} />
              <RetentionBar label="Day 30" value={overview?.retention.day30 ?? 0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              DAU History
            </CardTitle>
            <CardDescription>Daily active users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-end gap-1">
              {overview?.dauHistory.slice(-30).map((day) => (
                <div
                  key={day.date}
                  className="flex-1 bg-primary/80 hover:bg-primary transition-colors rounded-t cursor-pointer group relative"
                  style={{ height: `${(day.count / maxDau) * 100}%`, minHeight: '4px' }}
                  title={`${day.date}: ${day.count} users`}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg border">
                    {day.date}: {day.count}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {(!overview || overview.totalUsers === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No analytics data yet</p>
            <p className="text-sm text-muted-foreground mt-1">Data will appear once users start using your app with the SDK</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, description }: { title: string; value: number; icon: React.ElementType; description: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function RetentionBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface CohortData {
  cohortDate: string;
  cohortSize: number;
  retention: (number | null)[];
}

function RetentionTable({ cohorts }: { cohorts: CohortData[] }) {
  const weeks = ['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'];

  if (cohorts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No retention data available yet</p>
        <p className="text-sm mt-1">Cohorts will appear as users start using your app</p>
      </div>
    );
  }

  const getRetentionColor = (value: number | null): string => {
    if (value === null) return 'bg-transparent';
    if (value >= 80) return 'bg-emerald-500/90 text-white';
    if (value >= 60) return 'bg-emerald-500/70 text-white';
    if (value >= 40) return 'bg-emerald-500/50 text-white';
    if (value >= 20) return 'bg-emerald-500/30';
    if (value > 0) return 'bg-emerald-500/20';
    return 'bg-muted/50';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cohort</th>
            <th className="text-center py-3 px-2 font-medium text-muted-foreground">Users</th>
            {weeks.map((week) => (
              <th key={week} className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[60px]">
                {week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort, index) => (
            <tr key={cohort.cohortDate} className="border-b last:border-0">
              <td className="py-2 px-2 font-medium whitespace-nowrap">
                {formatDate(cohort.cohortDate)}
              </td>
              <td className="py-2 px-2 text-center text-muted-foreground">
                {cohort.cohortSize}
              </td>
              {cohort.retention.map((value, weekIndex) => (
                <td key={weekIndex} className="py-2 px-1">
                  <div
                    className={cn(
                      'rounded px-2 py-1.5 text-center text-xs font-medium transition-colors',
                      getRetentionColor(value)
                    )}
                  >
                    {value !== null ? `${value}%` : '-'}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>Retention scale:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500/20" />
          <span>0-20%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500/40" />
          <span>20-40%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500/60" />
          <span>40-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500/80" />
          <span>60-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span>80-100%</span>
        </div>
      </div>
    </div>
  );
}
