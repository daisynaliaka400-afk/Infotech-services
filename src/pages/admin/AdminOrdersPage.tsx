import { useEffect, useState, useCallback } from 'react';
import {
  Search, Download, Filter, Eye, ChevronLeft, ChevronRight, ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { getOrders } from '@/services/api';
import type { Order } from '@/types/types';

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'status-pending' },
  processing: { label: 'Processing', cls: 'status-processing' },
  success: { label: 'Paid', cls: 'status-success' },
  failed: { label: 'Failed', cls: 'status-failed' },
  cancelled: { label: 'Cancelled', cls: 'status-failed' },
};

const PAGE_SIZE = 20;

function exportCSV(orders: Order[]) {
  const header = ['Order Number', 'Bundle', 'Phone', 'Amount (KES)', 'Status', 'Payment Ref', 'Date'];
  const rows = orders.map((o) => [
    o.order_number, o.bundle_name, o.phone_number, o.bundle_price,
    o.payment_status, o.payment_reference ?? '', new Date(o.created_at).toLocaleString('en-KE')
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    getOrders({ search, status, page, page_size: PAGE_SIZE })
      .then(({ orders: o, total: t }) => { setOrders(o); setTotal(t); })
      .finally(() => setLoading(false));
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    const { orders: all } = await getOrders({ search, status, page: 1, page_size: 10000 });
    setAllOrders(all);
    exportCSV(all);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-balance">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all orders.</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="shrink-0">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, phone, bundle..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="success">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border min-w-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-balance">
            {total} order{total !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded bg-muted" />)}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Order', 'Bundle', 'Phone', 'Amount', 'Status', 'Date', ''].map((h, i) => (
                      <th key={i} className={`py-2 px-2 font-medium text-muted-foreground whitespace-nowrap ${h === 'Amount' || h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const s = statusMap[o.payment_status] ?? { label: o.payment_status, cls: '' };
                    return (
                      <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-2 font-mono text-xs whitespace-nowrap">{o.order_number}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap max-w-[180px] truncate">{o.bundle_name}</td>
                        <td className="py-2.5 px-2 font-mono text-xs whitespace-nowrap">{o.phone_number}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-primary whitespace-nowrap">KES {o.bundle_price}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString('en-KE')}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewOrder(o)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} results
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(o) => !o && setViewOrder(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Order Details</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              {[
                ['Order Number', viewOrder.order_number, true],
                ['Bundle', viewOrder.bundle_name],
                ['Amount', `KES ${viewOrder.bundle_price}`],
                ['Phone', viewOrder.phone_number, true],
                ['Status', viewOrder.payment_status],
                ['M-Pesa Ref', viewOrder.payment_reference ?? 'N/A', true],
                ['Created', new Date(viewOrder.created_at).toLocaleString('en-KE')],
                ['Updated', new Date(viewOrder.updated_at).toLocaleString('en-KE')],
              ].map(([label, val, mono]) => (
                <div key={String(label)} className="flex justify-between gap-4 py-1.5 border-b border-border last:border-0">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className={`font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>{String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
