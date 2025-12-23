import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Users, UserCheck, TrendingUp, BarChart3, Table, GitCompare } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const params = useParams<{ appId: string }>();
  const [selectedSegment, setSelectedSegment] = useState<string>('all');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', params.appId],
    queryFn: () => api.analytics.overview(params.appId!),
    enabled: !!params.appId,
    refetchInterval: 30000,
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['segments', params.appId],
    queryFn: () => api.segments.list(params.appId),
    enabled: !!params.appId,
  });

  const { data: retentionData } = useQuery({
    queryKey: ['retention-cohort', params.appId, selectedSegment],
    queryFn: () => api.analytics.retentionCohort(
      params.appId!, 
      8, 
      selectedSegment === 'all' ? undefined : selectedSegment
    ),
    enabled: !!params.appId,
    refetchInterval: 60000,
  });

  const { data: comparisonData } = useQuery({
    queryKey: ['retention-comparison', params.appId],
    queryFn: () => api.analytics.retentionComparison(params.appId!),
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Retention by Segment
              </CardTitle>
              <CardDescription>Compare retention rates across user segments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RetentionComparisonTable comparisons={comparisonData?.comparisons ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Retention Cohorts
              </CardTitle>
              <CardDescription>Weekly cohort retention analysis</CardDescription>
            </div>
            <Select value={selectedSegment} onValueChange={setSelectedSegment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {segments.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          {cohorts.map((cohort) => (
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

interface ComparisonData {
  segmentId: string | null;
  segmentName: string;
  userCount: number;
  retention: {
    week1: number;
    week2: number;
    week4: number;
    week8: number;
  };
}

function RetentionComparisonTable({ comparisons }: { comparisons: ComparisonData[] }) {
  if (comparisons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No comparison data available yet</p>
        <p className="text-sm mt-1">Create segments to compare retention rates</p>
      </div>
    );
  }

  const getRetentionColor = (value: number): string => {
    if (value >= 80) return 'text-emerald-400';
    if (value >= 60) return 'text-emerald-500';
    if (value >= 40) return 'text-yellow-500';
    if (value >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBarWidth = (value: number): string => {
    return `${Math.min(100, value)}%`;
  };

  const maxRetention = Math.max(
    ...comparisons.flatMap((c) => [c.retention.week1, c.retention.week2, c.retention.week4, c.retention.week8])
  ) || 100;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Segment</th>
            <th className="text-center py-3 px-2 font-medium text-muted-foreground">Users</th>
            <th className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[120px]">Week 1</th>
            <th className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[120px]">Week 2</th>
            <th className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[120px]">Week 4</th>
            <th className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[120px]">Week 8</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((comparison) => (
            <tr key={comparison.segmentId ?? 'all'} className="border-b last:border-0">
              <td className="py-3 px-2">
                <div className="font-medium">{comparison.segmentName}</div>
              </td>
              <td className="py-3 px-2 text-center text-muted-foreground">
                {comparison.userCount.toLocaleString()}
              </td>
              <td className="py-3 px-2">
                <RetentionCell value={comparison.retention.week1} maxValue={maxRetention} />
              </td>
              <td className="py-3 px-2">
                <RetentionCell value={comparison.retention.week2} maxValue={maxRetention} />
              </td>
              <td className="py-3 px-2">
                <RetentionCell value={comparison.retention.week4} maxValue={maxRetention} />
              </td>
              <td className="py-3 px-2">
                <RetentionCell value={comparison.retention.week8} maxValue={maxRetention} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RetentionCell({ value, maxValue }: { value: number; maxValue: number }) {
  const getColor = (v: number): string => {
    if (v >= 60) return 'bg-emerald-500';
    if (v >= 40) return 'bg-emerald-400';
    if (v >= 20) return 'bg-yellow-500';
    if (v >= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getColor(value))}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs font-medium w-10 text-right">{value}%</span>
    </div>
  );
}
