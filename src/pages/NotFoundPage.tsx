import { useNavigate } from 'react-router-dom';
import { Wifi, Home, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-background py-16">
        <div className="text-center px-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Wifi className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
          <h2 className="text-xl font-semibold mb-3 text-balance">Page Not Found</h2>
          <p className="text-muted-foreground text-sm mb-8 text-pretty">
            The page you're looking for doesn't exist. Let's get you back on track.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" /> Go to Home
            </Button>
            <Button variant="outline" onClick={() => navigate('/bundles')}>
              <Package className="mr-2 h-4 w-4" /> Browse Bundles
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
