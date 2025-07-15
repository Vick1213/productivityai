'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Newspaper,CheckSquare, BarChart2, Settings, Calendar, BookUser, BrainIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useIsClient } from '@/lib/hooks/useIsClient';

const allNavItems = [
  { href: '/dashboard', icon: Home, label: 'Overview', clientAllowed: false },
  { href: '/dashboard/campaignreports', icon: Newspaper, label: 'Campaign Reports', clientAllowed: false },
  { href: '/dashboard/projects', icon: CheckSquare, label: 'Projects', clientAllowed: false },
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics', clientAllowed: true },
  { href: '/dashboard/team', icon: BookUser, label: 'Team', clientAllowed: true },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar', clientAllowed: false },
  { href: '/dashboard/ai', icon: BrainIcon, label: 'AI Assistant', clientAllowed: true },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', clientAllowed: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isClient, loading } = useIsClient();

  // Filter nav items based on client status
  const nav = allNavItems.filter(item => 
    isClient === null || !isClient || item.clientAllowed
  );

  if (loading) {
    return (
      <aside className="hidden md:flex w-64 flex-col gap-4 border-r bg-background p-4">
        <h1 className="text-2xl font-semibold tracking-tight">SocialScape App</h1>
        <Separator />
        <div className="flex-1 space-y-2">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex w-64 flex-col gap-4 border-r bg-background p-4">
      <h1 className="text-2xl font-semibold tracking-tight">SocialScape App</h1>
      <Separator />
      <nav className="flex-1 space-y-2">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
              pathname === href && 'bg-accent'
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
      {isClient && (
        <div className="mt-auto p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Client Access</p>
          <p className="text-xs text-blue-500">Limited dashboard access</p>
        </div>
      )}
    </aside>
  );
}