'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{
    id: string;
    name: string;
    completed: boolean;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueAt: Date;
  }>;
}

interface ProjectPanelProps {
  projects: Project[];
}

export function ProjectPanel({ projects }: ProjectPanelProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const getCompletedTasksCount = (project: Project) => {
    return project.tasks.filter(task => task.completed).length;
  };

  const getPriorityColor = (priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (priority) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <section className="grid gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
        <Badge variant="outline" className="text-sm">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => handleProjectClick(project)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate text-lg font-semibold">{project.name}</span>
                <Badge variant="outline" className="text-xs">
                  {project.tasks.length} tasks
                </Badge>
              </CardTitle>
              {project.description && (
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {getCompletedTasksCount(project)}/{project.tasks.length} completed
                </span>
              </div>
              
              {project.tasks.length > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(getCompletedTasksCount(project) / project.tasks.length) * 100}%` 
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created {format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectClick(project);
                  }}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm">Create your first project to get started!</p>
          </div>
        </div>
      )}

      {/* Project Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProject.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {selectedProject.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedProject.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(selectedProject.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(selectedProject.updatedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">
                    Tasks ({selectedProject.tasks.length})
                  </h4>
                  
                  {selectedProject.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProject.tasks.map((task) => (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              task.completed ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className={`${
                              task.completed ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {task.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Due {format(new Date(task.dueAt), 'MMM d')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No tasks in this project yet.</p>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Project Progress</span>
                      <p className="text-sm text-muted-foreground">
                        {getCompletedTasksCount(selectedProject)} of {selectedProject.tasks.length} tasks completed
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {selectedProject.tasks.length > 0 
                          ? Math.round((getCompletedTasksCount(selectedProject) / selectedProject.tasks.length) * 100)
                          : 0
                        }%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
