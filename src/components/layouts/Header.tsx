import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wifi, Menu, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSettings } from '@/hooks/useSettings';

interface HeaderProps {
  onBuyClick?: () => void;
}

export default function Header({ onBuyClick }: HeaderProps) {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navLinks = [
    { label: 'Bundles', onClick: () => { onBuyClick?.(); navigate('/'); } },
    { label: 'Track Order', onClick: () => navigate('/track-order') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0 text-foreground">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center shrink-0">
              <Wifi className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="hidden md:block text-balance">
            {settings?.site_name ?? 'Infotech Internet Services'}
          </span>
          <span className="md:hidden font-semibold">Infotech</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={l.onClick}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {l.label}
            </button>
          ))}
          {settings?.whatsapp_number && (
            <a
              href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <Phone className="h-4 w-4" /> Support
            </a>
          )}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          <Button size="sm" className="font-semibold" onClick={() => { onBuyClick?.(); navigate('/'); }}>
            Buy Bundle
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-sidebar">
            <nav className="flex flex-col gap-1 mt-6">
              {navLinks.map((l) => (
                <button
                  key={l.label}
                  onClick={() => { l.onClick(); setMobileOpen(false); }}
                  className="flex items-center px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium transition-colors text-left"
                >
                  {l.label}
                </button>
              ))}
              {settings?.whatsapp_number && (
                <a
                  href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium transition-colors"
                >
                  <Phone className="h-4 w-4" /> WhatsApp Support
                </a>
              )}
              <Button
                className="mt-4 mx-4"
                onClick={() => { navigate('/'); onBuyClick?.(); setMobileOpen(false); }}
              >
                Buy Bundle Now
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

