'use client'
import { UserButton, ClerkProvider } from '@clerk/nextjs';
import { NotificationBell } from '@/components/notifications/notificationBell';

export function Topbar() {
  return (
    <ClerkProvider>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
        <div className="text-lg font-medium">Dashboard</div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <UserButton afterSignOutUrl="/" appearance={{ elements: { AvatarBox: 'h-8 w-8' } }} />
        </div>
      </header>
    </ClerkProvider>
  );
}