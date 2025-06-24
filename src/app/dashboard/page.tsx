// page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { TaskPanel } from '@/components/dashboard/task-panel';
import { ProjectPanel } from '@/components/dashboard/project-panel';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });


const projects = await prisma.project.findMany({
    where: { users: { some: { id: userId } } },
    include: { 
      tasks: {
        select: {
          id: true,
          name: true,
          completed: true,
          priority: true,
          dueAt: true,
        }
      }
    },
  });

  return (
    <div className="space-y-8">
      <TaskPanel tasks={tasks} />
      <ProjectPanel projects={projects} />
    </div>
  );
}