import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, Wifi, MessageSquare, Phone, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import type { Bundle } from '@/types/types';
import { toast } from 'sonner';

const PAYMENT_BASE_URL = 'https://pay.gifted.co.ke/pay/infotechservices';

type Step = 'enter_phone' | 'payment' | 'success' | 'failed';

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

function validatePhone(phone: string): boolean {
  return /^(?:254|\+254|0)?(7[0-9]{8}|1[0-9]{8})$/.test(phone.replace(/\s+/g, ''));
}

function generateOrderRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

interface Props {
  bundle: Bundle;
  onClose: () => void;
}

export default function CheckoutModal({ bundle, onClose }: Props) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [step, setStep] = useState<Step>('enter_phone');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((oid: string) => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > 45) { stopPolling(); setStep('failed'); return; }
      try {
        const { data } = await supabase
          .from('orders').select('payment_status').eq('id', oid).maybeSingle();
        if (data?.payment_status === 'success') { stopPolling(); setStep('success'); }
        else if (data?.payment_status === 'failed' || data?.payment_status === 'cancelled') {
          stopPolling(); setStep('failed');
        }
      } catch (_) { /* keep polling */ }
    }, 4000);
  }, [stopPolling]);

  const handlePay = async () => {
    if (!validatePhone(phone)) { setPhoneError('Enter a valid Safaricom number (e.g. 0712 345 678)'); return; }
    setPhoneError('');
    setLoading(true);
    try {
      const orderRef = generateOrderRef();
      const normalizedPhone = normalizePhone(phone);

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          bundle_id: bundle.id,
          phone_number: normalizedPhone,
          order_reference: orderRef,
        },
        method: 'POST',
      });

      if (error || !data?.order) {
        toast.error(data?.error || 'Failed to create order. Please try again.');
        setLoading(false);
        return;
      }

      const oid = data.order.id as string;
      const onum = data.order.order_number as string;
      setOrderId(oid);
      setOrderNumber(onum);

      // Build payment URL with reference params
      const params = new URLSearchParams({
        ref: orderRef,
        amount: String(bundle.price),
        phone: normalizedPhone,
        description: bundle.name,
      });
      setPaymentUrl(`${PAYMENT_BASE_URL}?${params.toString()}`);
      setStep('payment');
      startPolling(oid);
    } catch {
      toast.error('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    stopPolling();
    onClose();
    navigate('/payment-success', {
      state: { orderId, orderNumber, bundle, phone },
    });
  };

  const amount = bundle.data_amount ?? bundle.sms_amount ?? bundle.minutes_amount;
  const BundleIcon = bundle.data_amount ? Wifi : bundle.sms_amount ? MessageSquare : Phone;

  // Payment step uses near-fullscreen layout; other steps use a centred card
  const isFullscreen = step === 'payment';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === 'enter_phone' ? onClose : undefined}
      />

      {/* Modal — grows to near-fullscreen when showing the payment iframe */}
      <div
        className={[
          'relative z-10 w-full bg-card shadow-2xl flex flex-col transition-all duration-300',
          isFullscreen
            ? 'rounded-none md:rounded-2xl md:max-w-[96vw] md:mx-4 h-dvh md:h-[95dvh]'
            : 'rounded-t-2xl md:rounded-2xl md:max-w-lg max-h-[90dvh] overflow-y-auto',
        ].join(' ')}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          {step === 'payment' ? (
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                onClick={() => { stopPolling(); setStep('enter_phone'); }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{bundle.name}</p>
                <p className="text-xs text-muted-foreground">
                  Amount: <span className="font-bold text-primary">KES {bundle.price}</span>
                  {orderNumber && <> · Order: <span className="font-mono">{orderNumber}</span></>}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BundleIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm truncate max-w-[200px]">{bundle.name}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Body ── */}
        <div className={['flex-1 min-h-0', isFullscreen ? 'flex flex-col' : 'p-4 overflow-y-auto'].join(' ')}>

          {/* Bundle summary strip — not shown on success/failed */}
          {!isFullscreen && step !== 'success' && step !== 'failed' && (
            <div className="flex items-center justify-between gap-3 bg-muted rounded-xl p-3 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Selected bundle</p>
                <p className="font-semibold text-sm truncate">{bundle.name}</p>
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  {amount && <Badge variant="secondary" className="text-xs">{amount}</Badge>}
                  <Badge variant="outline" className="text-xs">{bundle.validity}</Badge>
                </div>
              </div>
              <p className="font-bold text-primary text-2xl shrink-0">KES {bundle.price}</p>
            </div>
          )}

          {/* ── Enter Phone ── */}
          {step === 'enter_phone' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="checkout-phone" className="text-sm font-normal">
                  Your Safaricom Phone Number
                </Label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                  className={`mt-1 text-base px-3 ${phoneError ? 'border-destructive' : ''}`}
                  onKeyDown={(e) => e.key === 'Enter' && handlePay()}
                />
                {phoneError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> {phoneError}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                <p>• A secure payment page will open inside this window</p>
                <p>• You will NOT be redirected to another tab</p>
                <p>• Complete payment and return here automatically</p>
              </div>
              <Button className="w-full h-11 font-semibold" onClick={handlePay} disabled={loading || !phone}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating order…</>
                  : `Continue to Pay KES ${bundle.price}`}
              </Button>
            </div>
          )}

          {/* ── Fullscreen Payment iframe ── */}
          {step === 'payment' && (
            <div className="flex-1 min-h-0 flex flex-col px-0 pb-0">
              {/* Status bar */}
              <div className="flex items-center gap-2 bg-[#00875A]/10 border-b border-[#00875A]/20 px-4 py-2 text-xs text-[#00875A] shrink-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>Complete your M-Pesa payment below — this window will update automatically once confirmed.</span>
              </div>
              {/* Full-height iframe */}
              <div className="flex-1 min-h-0 relative">
                {paymentUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={paymentUrl}
                    title="GiftedPay Payment"
                    className="absolute inset-0 w-full h-full border-0"
                    allow="payment"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                )}
              </div>
              {/* Footer bar */}
              <div className="shrink-0 border-t border-border px-4 py-2 flex items-center justify-between bg-card">
                <p className="text-xs text-muted-foreground">
                  Paying <span className="font-bold text-primary">KES {bundle.price}</span> for {bundle.name}
                </p>
                <Button
                  variant="ghost" size="sm" className="text-xs text-muted-foreground h-7"
                  onClick={() => { stopPolling(); setStep('failed'); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-16 h-16 rounded-full bg-[#00875A]/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-[#00875A]" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-balance">Payment Successful!</h2>
                <p className="text-muted-foreground text-sm mt-1 text-pretty">
                  Your bundle has been activated on <strong>{phone}</strong>.
                </p>
              </div>
              <div className="w-full rounded-lg bg-muted p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bundle</span>
                  <span className="font-medium">{bundle.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-bold text-primary">KES {bundle.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-mono text-xs">{orderNumber}</span>
                </div>
              </div>
              <Button className="w-full" onClick={handleSuccess}>View Receipt</Button>
            </div>
          )}

          {/* ── Failed ── */}
          {step === 'failed' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-9 w-9 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-balance">Payment Not Completed</h2>
                <p className="text-muted-foreground text-sm mt-1 text-pretty">
                  The payment was not confirmed. You can try again or track your order.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button onClick={() => setStep('enter_phone')}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                </Button>
                <Button variant="outline" onClick={() => { onClose(); navigate('/track-order'); }}>
                  Track Order
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
