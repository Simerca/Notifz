import { useState, useEffect } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { Bell, LayoutGrid, BellRing, ChevronRight, Menu, X, Target, Users, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [, params] = useRoute('/apps/:appId/*?');
  const [isNotificationsRoute] = useRoute('/apps/:appId/notifications');
  const [isSegmentsRoute] = useRoute('/apps/:appId/segments');
  const [isUsersRoute] = useRoute('/apps/:appId/users');
  const [isAnalyticsRoute] = useRoute('/apps/:appId/analytics');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  const appId = params?.appId;
  const isInAppContext = !!appId;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const getCurrentSection = () => {
    if (isNotificationsRoute) return 'Notifications';
    if (isSegmentsRoute) return 'Segments';
    if (isUsersRoute) return 'Users';
    if (isAnalyticsRoute) return 'Analytics';
    return 'Details';
  };

  const SidebarContent = () => (
    <>
      <div className="h-14 flex items-center justify-between px-5 border-b">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
            <Bell className="h-4 w-4 text-background" />
          </div>
          <span className="font-semibold text-sm tracking-tight">LocalNotification</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <Link
          href="/"
          className={cn(
            'sidebar-link',
            location === '/' && !isInAppContext ? 'sidebar-link-active' : 'sidebar-link-inactive'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Applications
        </Link>

        {isInAppContext && (
          <div className="pt-4">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current App
            </div>
            <div className="mt-2 space-y-1">
              <Link
                href={`/apps/${appId}/notifications`}
                className={cn(
                  'sidebar-link',
                  isNotificationsRoute ? 'sidebar-link-active' : 'sidebar-link-inactive'
                )}
              >
                <BellRing className="h-4 w-4" />
                Notifications
              </Link>
              <Link
                href={`/apps/${appId}/segments`}
                className={cn(
                  'sidebar-link',
                  isSegmentsRoute ? 'sidebar-link-active' : 'sidebar-link-inactive'
                )}
              >
                <Target className="h-4 w-4" />
                Segments
              </Link>
              <Link
                href={`/apps/${appId}/users`}
                className={cn(
                  'sidebar-link',
                  isUsersRoute ? 'sidebar-link-active' : 'sidebar-link-inactive'
                )}
              >
                <Users className="h-4 w-4" />
                Users
              </Link>
              <Link
                href={`/apps/${appId}/analytics`}
                className={cn(
                  'sidebar-link',
                  isAnalyticsRoute ? 'sidebar-link-active' : 'sidebar-link-inactive'
                )}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
        <div className="px-3 py-1 text-xs text-muted-foreground">
          v2.0.0
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="lg:hidden h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
              <Bell className="h-3.5 w-3.5 text-background" />
            </div>
            <span className="font-semibold text-sm">LocalNotification</span>
          </Link>
        </div>
        <ThemeToggle />
      </header>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[hsl(var(--sidebar))] border-r flex flex-col transition-transform duration-300 lg:translate-x-0 lg:w-60',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      <div className="lg:ml-60">
        {isInAppContext && (
          <div className="h-11 border-b bg-background/80 backdrop-blur-sm flex items-center px-4 sm:px-6 sticky top-14 lg:top-0 z-30">
            <nav className="flex items-center gap-1 text-sm overflow-x-auto">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                Applications
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
              <span className="text-foreground font-medium whitespace-nowrap">
                {getCurrentSection()}
              </span>
            </nav>
          </div>
        )}
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
