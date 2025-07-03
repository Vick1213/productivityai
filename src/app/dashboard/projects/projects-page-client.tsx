'use client';

import { ProjectsClient } from './projects-client';
import CreateProjectForm from '@/components/dashboard/CreateProjectForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
export interface ProjectsPageClientProps {
  tasks: { id: string; name: string; description: string; }[];
}



export default  function ProjectsPageClient({ tasks }: ProjectsPageClientProps) {

  const [activeTab, setActiveTab] = useState('all');

  return (
    <section className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Manage your projects and track progress
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="create">Create Project</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <ProjectsClient onCreateProject={() => setActiveTab('create')} />
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