'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, BarChart2, Settings, Calendar, BookUser, BrainIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const nav = [
  { href: '/dashboard', icon: Home, label: 'Overview' },
  { href: '/dashboard/projects', icon: CheckSquare, label: 'Projects' },
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
  {href: '/dashboard/team', icon:BookUser, label: 'Team'},
  {href: '/dashboard/calendar', icon: Calendar, label: 'Calendar'},
  {href: '/dashboard/ai', icon: BrainIcon, label: 'AI Assistant' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
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
    </aside>
  );
}