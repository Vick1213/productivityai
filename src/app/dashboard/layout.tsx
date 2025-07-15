import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { ClientRestriction } from '@/components/dashboard/ClientRestriction';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { NotificationProvider } from '@/components/notifications/notifications';
import { ClerkProvider } from '@clerk/nextjs';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <NotificationProvider>
      <ClientRestriction>
        <div className="flex min-h-screen bg-muted/40">
          <Sidebar />
          <main className="flex flex-col flex-1">
            <Topbar />
            {children}
          </main>
        </div>
      </ClientRestriction>
    </NotificationProvider>
  );
}