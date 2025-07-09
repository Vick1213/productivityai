'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Calendar, 
  AlertTriangle, 
  Target, 
  CheckCircle, 
  Edit3, 
  ExternalLink,
  Clock,
  RefreshCw
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Goal {
  id: string;
  name: string;
  description: string | null;
  currentProgress: number;
  totalTarget: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  name: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueAt: Date;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  completed: boolean;
  dueAt: Date | null;
  smartleadCampaignId?: string | null;
  tasks: Task[];
  goals: Goal[];
  organization: {
    id: string;
    name: string;
  } | null;
}

interface AnalyticsPanelProps {
  projects: Project[];
}

export function AnalyticsPanel({ projects }: AnalyticsPanelProps) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [refreshingProject, setRefreshingProject] = useState<string | null>(null);

  // Toggle task completion
  const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean) => {
    setIsUpdating(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !currentCompleted,
        }),
      });

      if (response.ok) {
        // Refresh the page data
        window.location.reload();
      } else {
        console.error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  // SmartLeads refresh
  const refreshProject = async (project: Project) => {
    setRefreshingProject(project.id);
    try {
      const res = await fetch('/api/integrations/smartleads/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      
      if (res.ok) {
        window.location.reload();
      } else {
        console.error('Failed to refresh SmartLeads data');
      }
    } catch (error) {
      console.error('Error refreshing SmartLeads data:', error);
    } finally {
      setRefreshingProject(null);
    }
  };

  // Navigate to project details
  const viewProjectDetails = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  // Open project dialog
  const openProjectDialog = (project: Project) => {
    setSelectedProject(project);
    setIsProjectDialogOpen(true);
  };

  // Get high priority tasks across all projects
  const getHighPriorityTasks = () => {
    const allTasks: (Task & { projectName: string; projectId: string })[] = [];
    projects.forEach(project => {
      project.tasks
        .filter(task => !task.completed && task.priority === 'HIGH')
        .forEach(task => {
          allTasks.push({ ...task, projectName: project.name, projectId: project.id });
        });
    });
    return allTasks.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  };

  // Get tasks due soon (within next 7 days)
  const getTasksDueSoon = () => {
    const now = new Date();
    const nextWeek = addDays(now, 7);
    const allTasks: (Task & { projectName: string; projectId: string })[] = [];
    
    projects.forEach(project => {
      project.tasks
        .filter(task => 
          !task.completed && 
          isAfter(new Date(task.dueAt), now) && 
          isBefore(new Date(task.dueAt), nextWeek)
        )
        .forEach(task => {
          allTasks.push({ ...task, projectName: project.name, projectId: project.id });
        });
    });
    return allTasks.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  };

  const highPriorityTasks = getHighPriorityTasks();
  const tasksDueSoon = getTasksDueSoon();
  const smartleadProjects = projects.filter(p => p.smartleadCampaignId);
  const normalProjects = projects.filter(p => !p.smartleadCampaignId);

  const priorityColor = (p: 'LOW' | 'MEDIUM' | 'HIGH') =>
    p === 'HIGH' ? 'destructive' : p === 'MEDIUM' ? 'default' : 'secondary';

  const getGoalProgress = (goal: Goal) => 
    goal.totalTarget > 0 ? (goal.currentProgress / goal.totalTarget) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track your project progress and upcoming deadlines</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* SmartLeads Projects Section */}
      {smartleadProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> SmartLeads Campaigns
          </h3>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {smartleadProjects.map(project => (
              <Card key={project.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        {project.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-2 flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          ID: {project.smartleadCampaignId}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant={refreshingProject === project.id ? "secondary" : "outline"}
                      onClick={() => refreshProject(project)}
                      disabled={refreshingProject === project.id}
                      className="ml-2"
                    >
                      {refreshingProject === project.id ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin mr-1" />
                          Syncing
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sync
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {project.goals.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <RefreshCw className="h-8 w-8 text-blue-500" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        No campaign metrics available
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click "Refresh" to sync your SmartLeads data
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {project.goals.map(g => (
                        <div key={g.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="font-semibold text-gray-900">{g.name}</span>
                            </div>
                            <div className="bg-white px-3 py-1 rounded-full border shadow-sm">
                              <span className="text-lg font-bold text-blue-600">{g.currentProgress.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {g.description || 'Campaign activity'}
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md">
                              Updated {format(new Date(g.updatedAt), 'MMM d')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-4 border-t bg-gray-50/50">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground">
                      {project.goals.length} metric{project.goals.length !== 1 ? 's' : ''} tracked
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openProjectDialog(project)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      View Details
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Priority Tasks Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* High Priority Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              High Priority Tasks
            </CardTitle>
            <CardDescription>
              {highPriorityTasks.length} high priority tasks requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highPriorityTasks.length > 0 ? (
              <div className="space-y-3">
                {highPriorityTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleTaskCompletion(task.id, task.completed)}
                        disabled={isUpdating === task.id}
                      >
                        {isUpdating === task.id ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-current rounded" />
                        )}
                      </Button>
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">{task.name}</p>
                        <button
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => viewProjectDetails(task.projectId)}
                        >
                          Project: {task.projectName} →
                        </button>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={priorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(task.dueAt), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
                {highPriorityTasks.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{highPriorityTasks.length - 5} more high priority tasks
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No high priority tasks!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Due Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Due This Week
            </CardTitle>
            <CardDescription>
              {tasksDueSoon.length} tasks due in the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasksDueSoon.length > 0 ? (
              <div className="space-y-3">
                {tasksDueSoon.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleTaskCompletion(task.id, task.completed)}
                        disabled={isUpdating === task.id}
                      >
                        {isUpdating === task.id ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-current rounded" />
                        )}
                      </Button>
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">{task.name}</p>
                        <button
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => viewProjectDetails(task.projectId)}
                        >
                          Project: {task.projectName} →
                        </button>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={priorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.dueAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
                {tasksDueSoon.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{tasksDueSoon.length - 5} more tasks due soon
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tasks due this week!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects with Goals */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold tracking-tight">Project Progress</h3>
        
        {normalProjects.map((project) => (
          <Card key={project.id} className="w-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <button
                    className="text-left"
                    onClick={() => openProjectDialog(project)}
                  >
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <CardDescription className="mt-1">
                        {project.description}
                      </CardDescription>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right space-y-1">
                    {project.organization && (
                      <Badge variant="outline" className="text-xs">
                        {project.organization.name}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {project.tasks.filter(t => t.completed).length}/{project.tasks.length} tasks
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewProjectDetails(project.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openProjectDialog(project)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Project Goals */}
              {project.goals.length > 0 && (
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-semibold">
                    <Target className="h-4 w-4" />
                    Goals ({project.goals.length})
                  </h4>
                  
                  {project.goals.map((goal) => (
                    <div key={goal.id} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{goal.name}</h5>
                        <span className="text-sm font-medium">
                          {goal.currentProgress}
                        </span>
                      </div>
                      
                      {goal.description && (
                        <p className="text-sm text-muted-foreground">
                          {goal.description}
                        </p>
                      )}
                      
                      <div className="text-xs text-muted-foreground text-right">
                        Updated {format(new Date(goal.updatedAt), 'MMM d')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Tasks */}
              <div className="space-y-3">
                <h4 className="font-semibold">Recent Tasks</h4>
                {project.tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleTaskCompletion(task.id, task.completed)}
                        disabled={isUpdating === task.id}
                      >
                        {isUpdating === task.id ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : task.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-current rounded" />
                        )}
                      </Button>
                      <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                        {task.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.dueAt), 'MMM d')}
                      </span>
                    </div>
                  </div>
                ))}
                {project.tasks.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => viewProjectDetails(project.id)}
                  >
                    View all {project.tasks.length} tasks →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Details Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  {selectedProject.name}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewProjectDetails(selectedProject.id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                </DialogTitle>
                <DialogDescription>
                  {selectedProject.description || 'No description available'}
                  {selectedProject.smartleadCampaignId && (
                    <div className="mt-1 text-xs">
                      <Badge variant="outline">SmartLeads ID: {selectedProject.smartleadCampaignId}</Badge>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Project Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Organization:</span>
                    <p className="text-muted-foreground">
                      {selectedProject.organization?.name || 'No organization'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(selectedProject.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Goals */}
                {selectedProject.goals.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Goals</h4>
                    {selectedProject.goals.map((goal) => (
                      <div key={goal.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{goal.name}</span>
                          <span className="text-sm font-medium">{goal.currentProgress}</span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        )}
                        <div className="text-xs text-muted-foreground text-right">
                          Updated {format(new Date(goal.updatedAt), 'MMM d')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All Tasks */}
                <div className="space-y-3">
                  <h4 className="font-semibold">All Tasks ({selectedProject.tasks.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedProject.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleTaskCompletion(task.id, task.completed)}
                            disabled={isUpdating === task.id}
                          >
                            {isUpdating === task.id ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : task.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 border-2 border-current rounded" />
                            )}
                          </Button>
                          <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                            {task.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={priorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.dueAt), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <div className="mb-4 text-4xl">📊</div>
            <h3 className="mb-2 text-lg font-semibold">No analytics data</h3>
            <p className="text-sm">Create projects and tasks to see analytics!</p>
          </div>
        </div>
      )}
    </div>
  );
}