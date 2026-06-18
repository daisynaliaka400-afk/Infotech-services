import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi, Search, MessageCircle, Phone, Mail, Package,
  Zap, ShieldCheck, Clock, Lock, Facebook, Twitter, Instagram
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CheckoutModal from '@/components/checkout/CheckoutModal';
import { getBundles, getCategories } from '@/services/api';
import type { Bundle, BundleCategory } from '@/types/types';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

const CAT_ORDER = ['Data Bundles', 'Buy Many Times', 'SMS Offers', 'Minutes Offers'];

// Category colour config
const CAT_STYLE: Record<string, { card: string; btn: string; icon: string; dot: string }> = {
  'Data Bundles':   { card: 'bg-[#e8f8f0] border-[#a8e6c5]', btn: 'bg-[#00875A] hover:bg-[#006644] text-white', icon: 'text-[#00875A]', dot: 'bg-[#00875A]' },
  'Buy Many Times': { card: 'bg-[#fff8e8] border-[#ffd980]',  btn: 'bg-[#e6a800] hover:bg-[#cc9600] text-white',  icon: 'text-[#e6a800]', dot: 'bg-[#e6a800]' },
  'SMS Offers':     { card: 'bg-[#e8f4ff] border-[#a8d4f5]', btn: 'bg-[#1a7fd4] hover:bg-[#1565b0] text-white', icon: 'text-[#1a7fd4]', dot: 'bg-[#1a7fd4]' },
  'Minutes Offers': { card: 'bg-[#f3e8ff] border-[#c8a0e8]', btn: 'bg-[#8b35cc] hover:bg-[#7228b0] text-white', icon: 'text-[#8b35cc]', dot: 'bg-[#8b35cc]' },
};
const DEFAULT_STYLE = CAT_STYLE['Data Bundles'];

function getCatStyle(catName: string) {
  return CAT_STYLE[catName] ?? DEFAULT_STYLE;
}

function BundleCard({ bundle, catName, onBuy }: { bundle: Bundle; catName: string; onBuy: (b: Bundle) => void }) {
  const s = getCatStyle(catName);
  const amount = bundle.data_amount ?? bundle.sms_amount ?? bundle.minutes_amount;
  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-2 h-full cursor-pointer transition-shadow hover:shadow-md ${s.card}`}
      onClick={() => onBuy(bundle)}>
      <div className="text-center">
        <p className="text-xl font-extrabold text-foreground leading-none">KES {bundle.price}</p>
        {amount && <p className="text-sm font-bold mt-0.5 text-foreground/80">{amount}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">Valid {bundle.validity}</p>
      </div>
      <button
        className={`w-full py-1.5 rounded text-xs font-semibold transition-colors ${s.btn}`}
        onClick={(e) => { e.stopPropagation(); onBuy(bundle); }}
      >
        Buy Now
      </button>
    </div>
  );
}

function CategorySection({ catName, bundles, onBuy, onViewAll }: {
  catName: string; bundles: Bundle[]; onBuy: (b: Bundle) => void; onViewAll?: () => void
}) {
  const s = getCatStyle(catName);
  const shown = bundles.slice(0, 7);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
          <h3 className="font-bold text-base text-foreground">{catName}</h3>
        </div>
        {bundles.length > 7 && (
          <button className="text-xs text-primary hover:underline font-medium" onClick={onViewAll}>View all</button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {shown.map((b) => <BundleCard key={b.id} bundle={b} catName={catName} onBuy={onBuy} />)}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [categories, setCategories] = useState<BundleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkoutBundle, setCheckoutBundle] = useState<Bundle | null>(null);
  const [trackInput, setTrackInput] = useState('');
  const bundlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getBundles(true), getCategories(true)])
      .then(([b, c]) => { setBundles(b); setCategories(c); })
      .finally(() => setLoading(false));
  }, []);

  const sortedCats = [
    ...CAT_ORDER.filter((n) => categories.some((c) => c.name === n)),
    ...categories.filter((c) => !CAT_ORDER.includes(c.name)).map((c) => c.name),
  ];

  const filtered = search
    ? bundles.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        String(b.price).includes(search) ||
        (b.data_amount ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : bundles;

  const grouped = new Map<string, Bundle[]>();
  for (const cat of sortedCats) {
    const cb = filtered.filter((b) => b.bundle_categories?.name === cat);
    if (cb.length) grouped.set(cat, cb);
  }

  const handleTrack = async () => {
    if (!trackInput.trim()) return;
    // Quick lookup then navigate
    const input = trackInput.trim();
    navigate(`/track-order?q=${encodeURIComponent(input)}`);
  };

  const whatsappNum = settings?.whatsapp_number?.replace(/\D/g, '') ?? '';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── TOP NAV ────────────────────────────────────────────── */}
      <header className="bg-[#0a1f14] text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#00875A] flex items-center justify-center">
              <Wifi className="h-4 w-4 text-white" />
            </div>
            <div className="leading-none">
              <p className="font-extrabold text-sm tracking-tight">INFOTECH</p>
              <p className="text-[9px] text-white/60 uppercase tracking-widest">Internet Services</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button className="text-[#4ade80] border-b-2 border-[#4ade80] pb-0.5">Home</button>
            <button className="text-white/80 hover:text-white transition-colors" onClick={() => navigate('/track-order')}>Track Order</button>
            <button className="text-white/80 hover:text-white transition-colors"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              How It Works
            </button>
            <button className="text-white/80 hover:text-white transition-colors"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
              Contact Us
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <a href={whatsappNum ? `https://wa.me/${whatsappNum}` : '#'} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-[#00875A] hover:bg-[#006644] text-white font-semibold hidden md:flex">
                <MessageCircle className="h-4 w-4 mr-1" /> Support
              </Button>
            </a>
            <Button size="sm" variant="ghost"
              className="text-white/60 hover:text-white border border-white/20 text-xs px-3"
              onClick={() => navigate('/admin/login')}>
              <Lock className="h-3 w-3 mr-1" /> Admin
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative bg-[#0a1f14] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Decorative glow blobs */}
          <div className="absolute top-8 right-8 w-80 h-80 rounded-full bg-[#00875A]/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-56 h-56 rounded-full bg-[#4ade80]/10 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#00875A]/20 border border-[#00875A]/40 rounded-full px-3 py-1 text-xs font-medium text-[#4ade80] mb-4">
              #1 Trusted Internet Bundles Provider
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight text-balance mb-4">
              Stay Connected,<br />
              <span className="text-[#4ade80]">Stay Ahead</span>
            </h1>
            <p className="text-white/75 text-base md:text-lg mb-6 max-w-md text-pretty">
              Buy affordable data, SMS and minutes bundles instantly and securely.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-[#4ade80]" /> Fast Delivery</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#4ade80]" /> Secure Payment</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-[#4ade80]" /> 24/7 Support</span>
            </div>
          </div>
          {/* Hero image / phone mockup */}
          <div className="hidden md:flex justify-center items-center">
            <div className="relative w-72 h-72">
              <div className="absolute inset-0 rounded-full bg-[#00875A]/20 border-2 border-[#00875A]/40 flex items-center justify-center">
                <div className="w-52 h-52 rounded-full bg-[#00875A]/30 border border-[#4ade80]/30 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-[#00875A]/50 flex items-center justify-center">
                    <Wifi className="h-16 w-16 text-[#4ade80]" />
                  </div>
                </div>
              </div>
              {/* Labels */}
              <div className="absolute top-6 right-2 bg-[#0a1f14] border border-[#00875A]/50 rounded-lg px-3 py-1.5 text-xs text-[#4ade80] font-semibold">
                ⚡ Fast
              </div>
              <div className="absolute bottom-12 right-0 bg-[#0a1f14] border border-[#00875A]/50 rounded-lg px-3 py-1.5 text-xs text-[#4ade80] font-semibold">
                🔒 Secure
              </div>
              <div className="absolute bottom-4 left-4 bg-[#0a1f14] border border-[#00875A]/50 rounded-lg px-3 py-1.5 text-xs text-[#4ade80] font-semibold">
                ✅ Reliable
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BUNDLES SECTION ────────────────────────────────────── */}
      <section ref={bundlesRef} id="bundles" className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header + search */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">All Bundles</h2>
              <p className="text-sm text-muted-foreground">Choose from our wide range of affordable bundles</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search bundles..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Bundle grid split into two halves: left = bundles, right = track + help */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: bundle categories */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg bg-muted" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Wifi className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No bundles found</p>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([cat, bList]) => (
                  <CategorySection key={cat} catName={cat} bundles={bList} onBuy={setCheckoutBundle} />
                ))
              )}
            </div>

            {/* Right: Track order + Help */}
            <div className="w-full lg:w-72 shrink-0 space-y-4">
              {/* Track order card */}
              <div className="border border-border rounded-xl p-5 bg-white shadow-sm">
                <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Track Your Order
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Enter your phone number or order reference to track your order
                </p>
                <Input
                  placeholder="e.g. 07xxxxxxxx or Order ID"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  className="mb-3 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                />
                <Button className="w-full bg-[#0a1f14] hover:bg-[#0f2e1e] text-white font-semibold" onClick={handleTrack}>
                  Track Order
                </Button>
              </div>

              {/* Need Help card */}
              <div className="border border-border rounded-xl p-5 bg-white shadow-sm" id="contact">
                <h3 className="font-bold text-base mb-1">Need Help?</h3>
                <p className="text-xs text-muted-foreground mb-3">We're here for you 24/7</p>
                {whatsappNum && (
                  <a href={`https://wa.me/${whatsappNum}`} target="_blank" rel="noopener noreferrer" className="block mb-2">
                    <Button className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-semibold text-sm">
                      <MessageCircle className="h-4 w-4 mr-2" /> Chat on WhatsApp
                    </Button>
                  </a>
                )}
                {settings?.whatsapp_number && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    <Phone className="h-3.5 w-3.5" /> Call: {settings.whatsapp_number}
                  </p>
                )}
                {settings?.support_email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${settings.support_email}`} className="hover:underline">
                      {settings.support_email}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-12 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '1', icon: Package, t: 'Choose a Bundle', d: 'Browse and select from data, SMS or minutes bundles.' },
              { n: '2', icon: Zap, t: 'Complete Payment', d: 'Pay securely inside the app via GiftedPay — no redirects.' },
              { n: '3', icon: ShieldCheck, t: 'Bundle Activated', d: 'Your bundle is activated instantly on your line.' },
            ].map((s) => (
              <div key={s.n} className="bg-white rounded-xl p-6 shadow-sm border border-border flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#00875A]/10 text-[#00875A] font-bold text-lg flex items-center justify-center mb-3">{s.n}</div>
                <s.icon className="h-6 w-6 text-[#00875A] mb-2" />
                <h3 className="font-semibold mb-1">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────── */}
      <section className="bg-[#0a1f14] text-white py-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          {[
            { icon: Zap, t: 'Instant Delivery', d: 'Bundles delivered instantly' },
            { icon: ShieldCheck, t: 'Secure Payments', d: '100% secure transactions' },
            { icon: Package, t: 'Best Prices', d: 'Affordable & competitive' },
            { icon: Clock, t: '24/7 Support', d: 'We are always here' },
          ].map((f) => (
            <div key={f.t} className="flex flex-col items-center gap-1">
              <f.icon className="h-6 w-6 text-[#4ade80]" />
              <p className="font-semibold">{f.t}</p>
              <p className="text-white/60 text-xs">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-[#080f0a] text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#00875A] flex items-center justify-center">
                  <Wifi className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">INFOTECH</p>
                  <p className="text-[9px] text-white/50 uppercase tracking-widest">Internet Services</p>
                </div>
              </div>
              <p className="text-white/60 text-xs text-pretty">
                Your trusted partner for all your internet, SMS and minutes needs.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
              <ul className="space-y-1.5 text-xs text-white/60">
                <li><button className="hover:text-white transition-colors">Home</button></li>
                <li><button onClick={() => navigate('/track-order')} className="hover:text-white transition-colors">Track Order</button></li>
                <li><button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">How It Works</button></li>
                <li><button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Contact Us</button></li>
              </ul>
            </div>

            {/* Bundles */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Bundles</h4>
              <ul className="space-y-1.5 text-xs text-white/60">
                {CAT_ORDER.map((c) => (
                  <li key={c}><button className="hover:text-white transition-colors">{c}</button></li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Support</h4>
              <ul className="space-y-1.5 text-xs text-white/60">
                {whatsappNum && <li><a href={`https://wa.me/${whatsappNum}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a></li>}
                {settings?.support_email && <li><a href={`mailto:${settings.support_email}`} className="hover:text-white transition-colors">Email Us</a></li>}
                <li><span>FAQ</span></li>
              </ul>
              {/* We Accept */}
              <div className="mt-4">
                <p className="text-xs text-white/40 mb-2">We Accept</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#4ade80] border border-[#4ade80]/40 rounded px-2 py-0.5">M-PESA</span>
                  <span className="text-xs font-bold text-white/70 border border-white/20 rounded px-2 py-0.5">VISA</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/40">
              {settings?.footer_text ?? '© 2025 Infotech Internet Services. All rights reserved.'}
            </p>
            <div className="flex items-center gap-3 text-white/40">
              <Facebook className="h-4 w-4 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="h-4 w-4 hover:text-white cursor-pointer transition-colors" />
              <Instagram className="h-4 w-4 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      {checkoutBundle && (
        <CheckoutModal bundle={checkoutBundle} onClose={() => setCheckoutBundle(null)} />
      )}
    </div>
  );
}
