import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, ShoppingCart,
  Settings, BarChart3, ClipboardList, LogOut, Menu, X, Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import React from 'react';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/dashboard/bundles', label: 'Bundles', icon: Package },
  { to: '/admin/dashboard/categories', label: 'Categories', icon: Tag },
  { to: '/admin/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/dashboard/settings', label: 'Settings', icon: Settings },
  { to: '/admin/dashboard/logs', label: 'Audit Logs', icon: ClipboardList },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/admin/dashboard' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 text-sidebar-foreground font-bold">
          <Wifi className="h-5 w-5 text-sidebar-primary" />
          <span className="text-sm text-balance">Infotech Admin</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.to} onClick={() => setMobileOpen(false)}>
            <NavItem {...item} />
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/60 truncate mb-2">
          {user?.username ?? user?.display_name ?? 'Admin'}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-14 bg-sidebar border-b border-sidebar-border">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-sidebar">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-sidebar-foreground text-sm">Infotech Admin</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
