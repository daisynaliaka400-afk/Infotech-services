import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, Clock, CheckCircle2, ArrowRight,
  Package, Plus, List, Settings, FolderOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardStats, getOrders } from '@/services/api';
import type { DashboardStats, Order } from '@/types/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/* ── Status badge ─────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  success:    { label: 'Completed',  cls: 'bg-green-50 text-green-700 border-green-200' },
  failed:     { label: 'Failed',     cls: 'bg-red-50 text-red-700 border-red-200' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50 text-red-700 border-red-200' },
};

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ title, value, icon: Icon, bg, text, sub }: {
  title: string; value: string | number; icon: React.ElementType;
  bg: string; text: string; sub?: string;
}) {
  return (
    <Card className={`h-full border-0 shadow-sm ${bg}`}>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-white/80 mb-2">{title}</p>
        <p className={`text-3xl font-extrabold ${text}`}>{value}</p>
        {sub && <p className="text-xs text-white/70 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Fake sales data (last 30 days) ─────────────────────────────── */
function buildSalesData(orders: Order[]) {
  const days: Record<string, number> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    days[key] = 0;
  }
  for (const o of orders) {
    if (o.payment_status !== 'success') continue;
    const d = new Date(o.created_at);
    const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    if (key in days) days[key] += o.bundle_price;
  }
  return Object.entries(days).map(([date, revenue]) => ({ date, revenue }));
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getOrders({ page: 1, page_size: 100 }),
      getOrders({ page: 1, page_size: 5 }),
    ]).then(([s, all, recent]) => {
      setStats(s);
      setAllOrders(all.orders);
      setRecentOrders(recent.orders);
    }).finally(() => setLoading(false));
  }, []);

  const salesData = useMemo(() => buildSalesData(allOrders), [allOrders]);

  // Top bundles by order count
  const topBundles = useMemo(() => {
    const map = new Map<string, { name: string; count: number; price: number }>();
    for (const o of allOrders) {
      if (!map.has(o.bundle_id)) map.set(o.bundle_id, { name: o.bundle_name, count: 0, price: o.bundle_price });
      map.get(o.bundle_id)!.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [allOrders]);

  // Donut: orders by status
  const statusData = useMemo(() => {
    const s = stats;
    if (!s) return [];
    const total = s.total_orders || 1;
    return [
      { name: `Completed (${Math.round(s.success_orders / total * 100)}%)`, value: s.success_orders, color: '#22c55e' },
      { name: `Pending (${Math.round(s.pending_orders / total * 100)}%)`, value: s.pending_orders, color: '#f59e0b' },
      { name: `Failed (${Math.round(s.failed_orders / total * 100)}%)`, value: s.failed_orders, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Donut: payment method (mock — mostly M-Pesa)
  const paymentData = [
    { name: 'M-Pesa (96%)', value: 96, color: '#22c55e' },
    { name: 'Card (3%)',    value: 3,  color: '#3b82f6' },
    { name: 'Other (1%)',  value: 1,  color: '#9ca3af' },
  ];

  const quickActions = [
    { label: 'Add New Bundle',    icon: Plus,      path: '/admin/dashboard/bundles' },
    { label: 'Add New Category',  icon: FolderOpen, path: '/admin/dashboard/categories' },
    { label: 'View All Orders',   icon: List,       path: '/admin/dashboard/orders' },
    { label: 'Website Settings',  icon: Settings,   path: '/admin/dashboard/settings' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-muted" />)
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={`KES ${(stats?.total_revenue ?? 0).toLocaleString()}`}
              icon={TrendingUp}
              bg="bg-[#1a7fd4]" text="text-white"
              sub="+12.5% from last month"
            />
            <StatCard
              title="Total Orders"
              value={(stats?.total_orders ?? 0).toLocaleString()}
              icon={ShoppingCart}
              bg="bg-[#0e9f6e]" text="text-white"
              sub="+18.7% from last month"
            />
            <StatCard
              title="Pending Payments"
              value={stats?.pending_orders ?? 0}
              icon={Clock}
              bg="bg-[#e6a800]" text="text-white"
              sub="+2.4% from last month"
            />
            <StatCard
              title="Successful Orders"
              value={(stats?.success_orders ?? 0).toLocaleString()}
              icon={CheckCircle2}
              bg="bg-[#7c3aed]" text="text-white"
              sub="+15.3% from last month"
            />
          </>
        )}
      </div>

      {/* ── Charts row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales overview */}
        <Card className="xl:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Sales Overview</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">This Month</span>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-52 rounded bg-muted" />
            ) : (
              <div className="w-full min-w-0 overflow-hidden h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.split(' ')[1]}
                      interval={4} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`KES ${Number(v).toLocaleString()}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#00875A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Bundles */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Top Bundles</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">This Month</span>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded bg-muted" />)
            ) : topBundles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              topBundles.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00875A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground">{b.count} orders</p>
                  </div>
                  <p className="text-xs font-semibold text-[#00875A] shrink-0">KES {b.price}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Orders ────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded bg-muted" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    {['Order ID', 'Customer', 'Bundle', 'Amount', 'Status', 'Date'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => {
                    const s = STATUS_MAP[o.payment_status] ?? { label: o.payment_status, cls: 'bg-muted text-foreground border-border' };
                    return (
                      <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap text-muted-foreground">{o.order_number}</td>
                        <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">{o.phone_number}</td>
                        <td className="py-2.5 px-3 text-xs whitespace-nowrap max-w-[180px] truncate">{o.bundle_name}</td>
                        <td className="py-2.5 px-3 text-xs font-semibold whitespace-nowrap text-[#00875A]">KES {o.bundle_price}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(o.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard/orders')}>
              View All Orders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Bottom row: donut charts + quick actions ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Orders by status */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {loading ? (
              <Skeleton className="h-40 w-40 rounded-full bg-muted" />
            ) : (
              <div className="w-full min-w-0 overflow-hidden h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData.length ? statusData : [{ name: 'No data', value: 1, color: '#e5e7eb' }]}
                      cx="50%" cy="45%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                      {(statusData.length ? statusData : [{ color: '#e5e7eb' }]).map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Legend layout="horizontal" wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {!loading && <p className="text-sm font-semibold mt-1">{(stats?.total_orders ?? 0).toLocaleString()} Total</p>}
          </CardContent>
        </Card>

        {/* Orders by payment method */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Orders by Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-full min-w-0 overflow-hidden h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="45%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                    {paymentData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend layout="horizontal" wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {!loading && <p className="text-sm font-semibold mt-1">{(stats?.total_orders ?? 0).toLocaleString()} Total</p>}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((a) => (
              <button key={a.label}
                onClick={() => navigate(a.path)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium">
                <div className="flex items-center gap-2">
                  <a.icon className="h-4 w-4 text-[#00875A]" />
                  {a.label}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
