import { Link } from 'react-router-dom';
import { Wifi, MessageCircle, Mail } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="bg-sidebar text-sidebar-foreground mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-5 w-5 text-sidebar-primary" />
              <span className="font-bold text-lg">{settings?.site_name ?? 'Infotech Internet Services'}</span>
            </div>
            <p className="text-sidebar-foreground/70 text-sm text-pretty">
              Fast, affordable mobile data bundles, SMS, and minutes for Safaricom users across Kenya.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3 text-sidebar-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">Home</Link></li>
              <li><Link to="/bundles" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">Browse Bundles</Link></li>
              <li><Link to="/track-order" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">Track Order</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-3 text-sidebar-foreground">Contact Support</h3>
            <ul className="space-y-2 text-sm">
              {settings?.whatsapp_number && (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {settings.whatsapp_number}
                  </a>
                </li>
              )}
              {settings?.support_email && (
                <li>
                  <a
                    href={`mailto:${settings.support_email}`}
                    className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {settings.support_email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-sidebar-border mt-8 pt-6 text-center text-sm text-sidebar-foreground/60">
          {settings?.footer_text ?? '© 2024 Infotech Internet Services. All rights reserved.'}
        </div>
      </div>
    </footer>
  );
}
