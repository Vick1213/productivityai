import { ProjectsClient } from './projects-client';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import CreateProjectForm from '@/components/dashboard/CreateProjectForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  return (
    <section className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Manage your projects and track progress
        </p>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="create">Create Project</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <ProjectsClient />
        </TabsContent>
        
        <TabsContent value="create">
          <div className="max-w-2xl mx-auto">
            <CreateProjectForm unassignedTasks={tasks} />
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}