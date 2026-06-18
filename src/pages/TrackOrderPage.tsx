import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';
import { supabase } from '@/db/supabase';
import type { Order } from '@/types/types';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'status-pending' },
    processing: { label: 'Processing', cls: 'status-processing' },
    success: { label: 'Paid', cls: 'status-success' },
    failed: { label: 'Failed', cls: 'status-failed' },
    cancelled: { label: 'Cancelled', cls: 'status-failed' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {status === 'success' && <CheckCircle2 className="h-3 w-3" />}
      {(status === 'failed' || status === 'cancelled') && <XCircle className="h-3 w-3" />}
      {(status === 'pending' || status === 'processing') && <Clock className="h-3 w-3" />}
      {s.label}
    </span>
  );
}

export default function TrackOrderPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setOrder(null);
    setNotFound(false);
    setError('');

    try {
      const isOrderNumber = query.trim().toUpperCase().startsWith('ORD-');
      const isPhone = /^(?:254|\+254|0)?[71][0-9]{8}$/.test(query.trim().replace(/\s+/g, ''));

      let paramKey = 'order_id';
      let paramValue = query.trim();
      if (isOrderNumber) paramKey = 'order_number';
      else if (isPhone) paramKey = 'phone_number';

      const { data, error: fnErr } = await supabase.functions.invoke(
        `verify-payment?${paramKey}=${encodeURIComponent(paramValue)}`,
        { method: 'GET' }
      );

      if (fnErr) {
        const msg = await fnErr?.context?.text();
        if (msg?.includes('not found') || fnErr.message?.includes('404')) {
          setNotFound(true);
        } else {
          setError('Failed to look up order. Please try again.');
        }
        return;
      }

      if (data?.order) {
        setOrder(data.order);
      } else {
        setNotFound(true);
      }
    } catch (_) {
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-background py-8">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-balance">Track Your Order</h1>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              Enter your Order Number or Safaricom phone number to check status.
            </p>
          </div>

          <Card className="border-border">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="query" className="text-sm font-normal">
                  Order Number or Phone Number
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="query"
                    placeholder="e.g. ORD-20240601-ABC123 or 0712345678"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 text-base"
                    onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                  />
                </div>
              </div>
              <Button
                className="w-full h-11 font-semibold"
                onClick={handleTrack}
                disabled={loading || !query.trim()}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> Track Order</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {notFound && (
            <Card className="mt-4 border-border">
              <CardContent className="flex flex-col items-center text-center py-8 gap-3">
                <Package className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-balance">Order Not Found</p>
                <p className="text-sm text-muted-foreground text-pretty">
                  No order matched your search. Check the number and try again.
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="mt-4 border-destructive/30">
              <CardContent className="py-4 text-center text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          {order && (
            <Card className="mt-4 border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-balance">Order Details</CardTitle>
                  <StatusBadge status={order.payment_status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-mono font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bundle</span>
                  <span className="font-medium text-right max-w-[60%] text-balance">{order.bundle_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">KES {order.bundle_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-mono">{order.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(order.created_at).toLocaleString('en-KE')}</span>
                </div>
                {order.payment_reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">M-Pesa Ref</span>
                    <span className="font-mono font-medium">{order.payment_reference}</span>
                  </div>
                )}

                {order.payment_status === 'success' && (
                  <Button
                    className="w-full mt-2"
                    onClick={() => navigate('/payment-success', {
                      state: { orderId: order.id, orderNumber: order.order_number, bundle: { name: order.bundle_name, price: order.bundle_price }, phone: order.phone_number }
                    })}
                  >
                    View Receipt <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {order.payment_status === 'pending' || order.payment_status === 'processing' ? (
                  <Button variant="outline" className="w-full mt-2" onClick={handleTrack}>
                    <Loader2 className="mr-2 h-4 w-4" /> Refresh Status
                  </Button>
                ) : null}
                {order.payment_status === 'failed' && (
                  <Button className="w-full mt-2" onClick={() => navigate('/bundles')}>
                    Buy Again
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">Tips</p>
            <p>• Use your Order Number (ORD-...) for exact lookup</p>
            <p>• Use your phone number to find recent orders</p>
            <p>• Pending orders update automatically after payment</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
