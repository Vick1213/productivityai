/* components/project/ProjectPanel.tsx */
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  /* helpers */
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const completedCount = (p: Project) =>
    p.tasks.filter((t) => t.completed).length;

  const priorityColor = (p: 'LOW' | 'MEDIUM' | 'HIGH') =>
    p === 'HIGH' ? 'destructive' : p === 'MEDIUM' ? 'default' : 'secondary';

  /* ────────── render ────────── */
  return (
    <section className="grid gap-6 p-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
        <Badge variant="outline" className="text-sm">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
            onClick={() => handleProjectClick(project)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate text-lg font-semibold">
                  {project.name}
                </span>
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
              {/* progress bar */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {completedCount(project)}/{project.tasks.length} completed
                </span>
              </div>

              {project.tasks.length > 0 && (
                <div className="w-full rounded-full bg-gray-200 h-2">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${
                        (completedCount(project) / project.tasks.length) * 100
                      }%`,
                    }}
                  />
                </div>
              )}

              {/* meta row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                </span>

                {/* buttons */}
                <div className="flex gap-2">
                  {/* quick peek opens dialog */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProjectClick(project);
                    }}
                  >
                    Quick peek
                  </Button>

                  {/* full-page link */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`/dashboard/projects/${project.id}`}
                      aria-label="Open project details page"
                    >
                      Details
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* empty-state */}
      {projects.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-muted-foreground">
            <div className="mb-4 text-4xl">📁</div>
            <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
            <p className="text-sm">Create your first project to get started!</p>
          </div>
        </div>
      )}

      {/* dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedProject.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {selectedProject.description && (
                  <section>
                    <h4 className="mb-2 font-semibold">Description</h4>
                    <p className="text-muted-foreground">
                      {selectedProject.description}
                    </p>
                  </section>
                )}

                {/* meta grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Meta label="Created">
                    {format(
                      new Date(selectedProject.createdAt),
                      'MMM d, yyyy'
                    )}
                  </Meta>
                  <Meta label="Last updated">
                    {format(
                      new Date(selectedProject.updatedAt),
                      'MMM d, yyyy'
                    )}
                  </Meta>
                </div>

                {/* tasks list */}
                <section>
                  <h4 className="mb-3 font-semibold">
                    Tasks ({selectedProject.tasks.length})
                  </h4>

                  {selectedProject.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProject.tasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                t.completed ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                            <span
                              className={
                                t.completed
                                  ? 'line-through text-muted-foreground'
                                  : ''
                              }
                            >
                              {t.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={priorityColor(t.priority)}
                              className="text-xs"
                            >
                              {t.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Due {format(new Date(t.dueAt), 'MMM d')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tasks in this project yet.
                    </p>
                  )}
                </section>

                {/* progress summary */}
                <section className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Project Progress</span>
                      <p className="text-sm text-muted-foreground">
                        {completedCount(selectedProject)} of{' '}
                        {selectedProject.tasks.length} tasks completed
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {selectedProject.tasks.length > 0
                          ? Math.round(
                              (completedCount(selectedProject) /
                                selectedProject.tasks.length) *
                                100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* small meta cell */
function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-medium">{label}:</span>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
