import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import  ProjectsPageClient  from './projects-page-client';

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Fetch unassigned tasks for the create form
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

  return <ProjectsPageClient tasks={tasks} />;
}