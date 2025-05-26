import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import  prisma  from '@/lib/prisma';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { TaskPanel } from '@/components/dashboard/task-panel';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />
      <main className="flex flex-col flex-1">
        <Topbar />
        <TaskPanel tasks={tasks} />
      </main>
    </div>
  );
}