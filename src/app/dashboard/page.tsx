// page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SimplifiedTaskPanel } from '@/components/dashboard/simplified-task-panel';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Get tasks with project information
  const tasks = await prisma.task.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: { dueAt: 'asc' },
  });

  // Get projects for task creation
  const projects = await prisma.project.findMany({
    where: { users: { some: { id: userId } } },
    select: {
      id: true,
      name: true,
    }
  });

  // Map tasks so that project is undefined instead of null
  const mappedTasks = tasks.map(task => ({
    ...task,
    project: task.project === null ? undefined : task.project,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <SimplifiedTaskPanel tasks={mappedTasks} projects={projects} />
    </div>
  );
}