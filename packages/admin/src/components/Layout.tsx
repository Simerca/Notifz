import { Link, useLocation } from 'wouter';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Bell className="h-5 w-5 text-primary" />
            <span>LocalNotification</span>
          </Link>
          <nav className="ml-8 flex items-center gap-6 text-sm">
            <Link href="/" className={cn('transition-colors hover:text-foreground/80', location === '/' ? 'text-foreground' : 'text-foreground/60')}>
              Apps
            </Link>
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

