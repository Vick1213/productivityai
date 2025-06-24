// app/dashboard/projects/page.tsx  (server component)
// -----------------------------------------------------------------------------
// Allows a user to create a new project and optionally attach existing
// unassigned tasks or create a brand-new first task on the spot.
// -----------------------------------------------------------------------------

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import CreateProjectForm from '@/components/dashboard/CreateProjectForm';

export default async function ProjectsPage() {
  const { userId } =  await auth();
  if (!userId) redirect('/sign-in');

  // Fetch tasks that belong to the user but aren’t yet in a project
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      projectId: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <section className="mx-auto max-w-2xl p-6">
      <CreateProjectForm unassignedTasks={tasks} />

    
    </section>
  );
}