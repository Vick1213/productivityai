'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Goal {
  id: string;
  name: string;
  description: string | null;
  currentProgress: number;
  totalTarget: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  goals: Goal[];
  tasks: Array<{
    id: string;
    completed: boolean;
  }>;
}

interface AnalyticsPanelProps {
  projects: Project[];
}

export function AnalyticsPanel({ projects }: AnalyticsPanelProps) {
  const router = useRouter();
  const [hoveredGoal, setHoveredGoal] = useState<string | null>(null);

  // Filter projects that have goals
  const projectsWithGoals = projects.filter(project => project.goals.length > 0);

  const handleGoalClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  const calculateProgress = (current: number, total: number) => {
    return Math.min(Math.round((current / total) * 100), 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getTaskCompletionRate = (project: Project) => {
    if (project.tasks.length === 0) return 0;
    const completedTasks = project.tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  };

  return (
    <section className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Badge variant="outline">{projects.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects with Goals</CardTitle>
            <Badge variant="outline">{projectsWithGoals.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsWithGoals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Badge variant="outline">
              {projectsWithGoals.reduce((acc, project) => acc + project.goals.length, 0)}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectsWithGoals.reduce((acc, project) => acc + project.goals.length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectsWithGoals.length > 0
                ? Math.round(
                    projectsWithGoals.reduce((acc, project) => 
                      acc + project.goals.reduce((goalAcc, goal) => 
                        goalAcc + calculateProgress(goal.currentProgress, goal.totalTarget), 0
                      ) / project.goals.length, 0
                    ) / projectsWithGoals.length
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Project Goals</h2>
          <Badge variant="outline">
            {projectsWithGoals.reduce((acc, project) => acc + project.goals.length, 0)} goals
          </Badge>
        </div>

        {projectsWithGoals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectsWithGoals.map((project) => (
              <div key={project.id} className="space-y-3">
                {/* Project Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    {project.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {getTaskCompletionRate(project)}% tasks done
                  </Badge>
                </div>

                {/* Goals for this project */}
                <div className="space-y-2">
                  {project.goals.map((goal) => {
                    const progress = calculateProgress(goal.currentProgress, goal.totalTarget);
                    const progressColor = getProgressColor(progress);
                    
                    return (
                      <Card
                        key={goal.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                          hoveredGoal === goal.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => handleGoalClick(project.id)}
                        onMouseEnter={() => setHoveredGoal(goal.id)}
                        onMouseLeave={() => setHoveredGoal(null)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span className="truncate">{goal.name}</span>
                            <Badge 
                              variant={progress >= 100 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {progress}%
                            </Badge>
                          </CardTitle>
                          {goal.description && (
                            <CardDescription className="line-clamp-2">
                              {goal.description}
                            </CardDescription>
                          )}
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">
                                {goal.currentProgress.toLocaleString()} / {goal.totalTarget.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Goal Meta */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Updated {format(new Date(goal.updatedAt), 'MMM d, yyyy')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoalClick(project.id);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="text-muted-foreground">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-2 text-lg font-semibold">No goals set yet</h3>
              <p className="text-sm mb-4">
                Create goals for your projects to track progress and stay motivated!
              </p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/projects')}
              >
                Go to Projects
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}