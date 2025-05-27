'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, BarChart2, Settings, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const nav = [
  { href: '/dashboard', icon: Home, label: 'Overview' },
  { href: '/dashboard?tab=tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/dashboard?tab=analytics', icon: BarChart2, label: 'Analytics' },
  {href: '/dashboard/calendar', icon: Calendar, label: 'Calendar'}, // Assuming Calendar is the same as Home
  {href: '/dashboard/ai', icon: Home, label: 'AI Assistant' }, // Assuming AI Assistant is the same as Home
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 flex-col gap-4 border-r bg-background p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Productivity AI</h1>
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