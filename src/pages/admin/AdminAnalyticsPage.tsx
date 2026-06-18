import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getRevenueByDay, getTopBundles, getDashboardStats } from '@/services/api';
import type { DashboardStats } from '@/types/types';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [topBundles, setTopBundles] = useState<{ bundle_name: string; count: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getRevenueByDay(30),
      getRevenueByDay(7),
      getTopBundles(8),
    ]).then(([s, daily, weekly, top]) => {
      setStats(s);
      setDailyRevenue(daily);
      setWeeklyRevenue(weekly);
      setTopBundles(top);
    }).finally(() => setLoading(false));
  }, []);

  const summaryCards = [
    { title: 'Total Revenue', value: `KES ${(stats?.total_revenue ?? 0).toLocaleString()}`, icon: TrendingUp },
    {
      title: 'This Week (Revenue)',
      value: `KES ${weeklyRevenue.reduce((s, r) => s + r.revenue, 0).toLocaleString()}`,
      icon: Calendar
    },
    {
      title: 'This Month (Revenue)',
      value: `KES ${dailyRevenue.reduce((s, r) => s + r.revenue, 0).toLocaleString()}`,
      icon: BarChart3
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-balance">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Revenue and performance insights.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-muted" />)
        ) : summaryCards.map((c) => (
          <Card key={c.title} className="h-full border-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                <p className="text-xl font-bold mt-0.5">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Revenue Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base text-balance">Daily Revenue — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 rounded bg-muted" />
          ) : dailyRevenue.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No revenue data yet
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(v: number) => [`KES ${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Bundles */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base text-balance">Most Purchased Bundles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded bg-muted" />)}</div>
          ) : topBundles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No data yet</div>
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topBundles} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    type="category"
                    dataKey="bundle_name"
                    width={140}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
                  />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number, name: string) => [v, name === 'count' ? 'Orders' : 'Revenue (KES)']}
                  />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  <Bar dataKey="count" name="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="revenue" name="revenue" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
