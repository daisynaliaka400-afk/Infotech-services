import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Package, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';
import { useSettings } from '@/hooks/useSettings';

export default function PaymentSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { orderId, orderNumber, bundle, phone } = location.state ?? {};

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="max-w-md mx-auto px-4">
          <Card className="border-border">
            <CardContent className="flex flex-col items-center text-center pt-10 pb-8 px-6 gap-5">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-balance">Payment Successful!</h1>
                <p className="text-muted-foreground mt-2 text-pretty text-sm">
                  Your Safaricom bundle has been activated. Enjoy your services!
                </p>
              </div>

              {(orderNumber || bundle || phone) && (
                <div className="w-full rounded-lg bg-muted p-4 text-sm text-left space-y-2.5">
                  {orderNumber && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Order</span>
                      <span className="font-mono font-semibold text-right">{orderNumber}</span>
                    </div>
                  )}
                  {bundle?.name && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Bundle</span>
                      <span className="font-medium text-right text-balance">{bundle.name}</span>
                    </div>
                  )}
                  {bundle?.price && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-bold text-primary">KES {bundle.price}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-mono">{phone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2.5 w-full">
                {orderNumber && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/track-order')}
                    className="w-full"
                  >
                    <Package className="mr-2 h-4 w-4" /> Track Order
                  </Button>
                )}
                <Button className="w-full" onClick={() => navigate('/bundles')}>
                  Buy Another Bundle <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {settings?.whatsapp_number && (
                  <a
                    href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="ghost" className="w-full text-muted-foreground">
                      <MessageCircle className="mr-2 h-4 w-4" /> Contact Support
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
