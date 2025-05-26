'use client'
import { UserButton } from '@clerk/nextjs';

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="text-lg font-medium">Dashboard</div>
      <UserButton afterSignOutUrl="/" appearance={{ elements: { AvatarBox: 'h-8 w-8' } }} />
    </header>
  );
}