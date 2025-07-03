'use client';

import { ProjectPanel } from '@/components/dashboard/project-panel';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  completed: boolean;
  dueAt: Date | null;
  tasks: Array<{
    id: string;
    name: string;
    completed: boolean;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueAt: Date;
  }>;
  goals: Array<{
    id: string;
    name: string;
    description: string | null;
    currentProgress: number;
    totalTarget: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  organization: {
    id: string;
    name: string;
  } | null;
}

interface ProjectsClientProps {
  onCreateProject: () => void;
}

export function ProjectsClient({onCreateProject}: ProjectsClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await fetch('/api/projects');
        
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setError('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <div className="text-4xl mb-2">❌</div>
          <p className="text-lg font-semibold">{error}</p>
        </div>
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Your Projects</h2>
        <span className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Projects Display */}
      <ProjectPanel projects={projects} />
    </div>
  );
}