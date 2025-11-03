'use client';

import { useState, useRef, useTransition } from 'react';
import { addTask, toggleTask, deleteTask, updateTask } from '@/lib/actions/tasks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { Plus, MessageSquare, Calendar, Clock, Trash2, AlertTriangle, Target, CheckCircle, Edit, Users, Building } from 'lucide-react';
import { AudioTaskCreator } from './audio-task-creator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Task {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueAt?: Date;
  project?: {
    id: string;
    name: string;
    organizationId: string | null;
    organization: {
      id: string;
      name: string;
    } | null;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
  } | null;
}

interface Organization {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface SimplifiedTaskPanelProps {
  tasks: Task[];
  projects: Project[];
  organizations: Organization[];
  teamMembers: TeamMember[];
  currentUserId: string;
}

export function SimplifiedTaskPanel({ 
  tasks, 
  projects, 
  organizations, 
  teamMembers, 
  currentUserId 
}: SimplifiedTaskPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAudioCreator, setShowAudioCreator] = useState(false);
  const [showStatusPane, setShowStatusPane] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  // Group tasks by status
  const dueTasks = tasks.filter(task => !task.completed && task.dueAt && isPast(new Date(task.dueAt)));
  const todayTasks = tasks.filter(task => !task.completed && task.dueAt && isToday(new Date(task.dueAt)));
  const tomorrowTasks = tasks.filter(task => !task.completed && task.dueAt && isTomorrow(new Date(task.dueAt)));
  const upcomingTasks = tasks.filter(task => 
    !task.completed && 
    task.dueAt && 
    !isToday(new Date(task.dueAt)) && 
    !isTomorrow(new Date(task.dueAt)) && 
    !isPast(new Date(task.dueAt))
  );
  const completedTasks = tasks.filter(task => task.completed);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAIChat = async () => {
    if (!aiMessage.trim()) return;
    
    setAiResponse('Processing your request...');
    
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiMessage }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }
      
      // The API returns the OpenAI message object with content property
      const aiContent = data.content || data.message || data.response || 'Task processed successfully!';
      setAiResponse(aiContent);
      setAiMessage(''); // Clear input after successful request
      
      // Refresh the page to show newly created tasks or projects
      if (aiContent.toLowerCase().includes('successfully created') || 
          aiContent.toLowerCase().includes('project') || 
          aiContent.toLowerCase().includes('task')) {
        setTimeout(() => {
          window.location.reload();
        }, 2000); // Give user time to read the response
      }
      
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAiResponse(`Error: ${errorMessage}`);
    }
  };

  const handleAudioTranscription = async (transcription: string) => {
    // Set the AI message and show the chat panel
    setAiMessage(transcription);
    setShowAIChat(true);
    setShowAudioCreator(false);
    
    // Automatically send the transcription to AI for task creation
    setAiResponse('Processing your voice input...');
    
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Please create task(s) based on this voice input: "${transcription}"` }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process voice input');
      }
      
      // Handle the OpenAI response format
      const aiContent = data.content || data.response || 'Voice input processed successfully!';
      setAiResponse(aiContent);
      setAiMessage(''); // Clear the input after processing
      
      // Refresh the page to show newly created tasks
      if (aiContent.includes('Successfully created') || aiContent.includes('task')) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAiResponse(`Voice transcribed: "${transcription}"\n\nError processing: ${errorMessage}\n\nPlease review and send manually.`);
    }
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`
      transition-all duration-200 ease-in-out hover:shadow-md
      ${task.completed ? 'opacity-60 bg-gray-50' : 'bg-white'} 
      ${task.dueAt && isPast(new Date(task.dueAt)) && !task.completed ? 'border-red-200 bg-red-50' : ''}
      ${task.dueAt && isToday(new Date(task.dueAt)) && !task.completed ? 'border-orange-200 bg-orange-50' : ''}
    `}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => 
              startTransition(() => toggleTask(task.id, !!checked))
            }
            className="mt-1 transition-all duration-200"
          />
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm transition-all duration-200 ${
              task.completed ? 'line-through text-muted-foreground' : ''
            }`}>
              {task.name}
            </h3>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className={`transition-colors ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </Badge>
              {task.project && (
                <Badge variant="secondary" className="text-xs">
                  {task.project.name}
                </Badge>
              )}
              {task.project?.organization && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {task.project.organization.name}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={task.user.avatarUrl || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {task.user.firstName[0]}{task.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{task.user.firstName} {task.user.lastName}</span>
              </div>
              {task.dueAt && (
                <div className={`flex items-center gap-1 text-xs ${
                  isPast(new Date(task.dueAt)) && !task.completed 
                    ? 'text-red-600 font-medium' 
                    : isToday(new Date(task.dueAt)) && !task.completed
                    ? 'text-orange-600 font-medium'
                    : 'text-muted-foreground'
                }`}>
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.dueAt), 'MMM d, h:mm a')}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingTask(task)}
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-blue-100 hover:text-blue-600"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startTransition(() => deleteTask(task.id))}
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TaskSection = ({ title, tasks, color, icon }: { 
    title: string; 
    tasks: Task[]; 
    color: string;
    icon?: React.ReactNode;
  }) => (
    <div className="space-y-4">
      <div className={`
        flex items-center justify-between p-4 rounded-lg border-l-4 
        ${title === 'Overdue' ? 'border-red-500 bg-red-50' :
          title === 'Due Today' ? 'border-orange-500 bg-orange-50' :
          title === 'Due Tomorrow' ? 'border-blue-500 bg-blue-50' :
          title === 'Upcoming' ? 'border-gray-500 bg-gray-50' :
          'border-green-500 bg-green-50'}
      `}>
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${color}`}>
          {icon || <Calendar className="h-5 w-5" />}
          {title}
        </h2>
        <Badge variant="outline" className={`${color.replace('text-', 'text-')} border-current`}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks with AI assistance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showStatusPane ? "default" : "outline"}
            onClick={() => setShowStatusPane(!showStatusPane)}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Team Status
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAIChat(!showAIChat)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            AI Assistant
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAudioCreator(!showAudioCreator)}
            className="gap-2"
          >
            Voice Task
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Team Status Pane */}
      {showStatusPane && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Task Status
            </CardTitle>
            <CardDescription>Track task completion across your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => {
                const memberTasks = tasks.filter(t => t.user.id === member.id);
                const completedCount = memberTasks.filter(t => t.completed).length;
                const pendingCount = memberTasks.filter(t => !t.completed).length;
                const overdueCount = memberTasks.filter(
                  t => !t.completed && t.dueAt && isPast(new Date(t.dueAt))
                ).length;
                
                return (
                  <Card key={member.id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar>
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback>
                            {member.firstName[0]}{member.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {member.firstName} {member.lastName}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total Tasks:</span>
                          <Badge variant="outline">{memberTasks.length}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-green-600">Completed:</span>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            {completedCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-orange-600">Pending:</span>
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            {pendingCount}
                          </Badge>
                        </div>
                        {overdueCount > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-red-600">Overdue:</span>
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              {overdueCount}
                            </Badge>
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground mb-1">Completion Rate</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${memberTasks.length > 0 ? (completedCount / memberTasks.length) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <div className="text-xs text-center mt-1 font-medium">
                            {memberTasks.length > 0 
                              ? Math.round((completedCount / memberTasks.length) * 100) 
                              : 0}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Chat Panel */}
      {showAIChat && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me to create tasks, check progress, or manage your schedule..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                className="flex-1"
              />
              <Button onClick={handleAIChat}>Send</Button>
            </div>
            {aiResponse && (
              <div className="p-3 bg-white rounded-md border">
                <p className="text-sm">{aiResponse}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audio Creator Panel */}
      {showAudioCreator && (
        <AudioTaskCreator onTranscription={handleAudioTranscription} />
      )}

      {/* Edit Task Form */}
      {editingTask && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Edit Task</CardTitle>
          </CardHeader>
          <CardContent>
            <EditTaskForm
              task={editingTask}
              projects={projects}
              organizations={organizations}
              teamMembers={teamMembers}
              onCancel={() => setEditingTask(null)}
              onSubmit={() => {
                setEditingTask(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Task Form */}
      {showCreateForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg">Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateTaskForm
              projects={projects}
              organizations={organizations}
              teamMembers={teamMembers}
              onCancel={() => setShowCreateForm(false)}
              onSubmit={() => {
                setShowCreateForm(false);
                // Form submission handled by server action
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Task Sections */}
      <div className="space-y-8">
        {dueTasks.length > 0 && (
          <TaskSection 
            title="Overdue" 
            tasks={dueTasks} 
            color="text-red-600" 
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        )}
        
        {todayTasks.length > 0 && (
          <TaskSection 
            title="Due Today" 
            tasks={todayTasks} 
            color="text-orange-600" 
            icon={<Target className="h-5 w-5" />}
          />
        )}
        
        {tomorrowTasks.length > 0 && (
          <TaskSection 
            title="Due Tomorrow" 
            tasks={tomorrowTasks} 
            color="text-blue-600"
            icon={<Calendar className="h-5 w-5" />}
          />
        )}
        
        {upcomingTasks.length > 0 && (
          <TaskSection 
            title="Upcoming" 
            tasks={upcomingTasks} 
            color="text-gray-600"
            icon={<Clock className="h-5 w-5" />}
          />
        )}
        
        {completedTasks.length > 0 && (
          <TaskSection 
            title="Completed" 
            tasks={completedTasks} 
            color="text-green-600"
            icon={<CheckCircle className="h-5 w-5" />}
          />
        )}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">Create your first task to get started</p>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Task
          </Button>
        </div>
      )}
    </div>
  );
}

function CreateTaskForm({ 
  projects, 
  organizations,
  teamMembers,
  onCancel, 
  onSubmit 
}: { 
  projects: Project[]; 
  organizations: Organization[];
  teamMembers: TeamMember[];
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const filteredProjects = selectedOrg 
    ? projects.filter(p => p.organizationId === selectedOrg)
    : projects;

  return (
    <form 
      action={(formData) => {
        startTransition(async () => {
          await addTask(formData);
          onSubmit();
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Task Name</label>
          <Input name="name" placeholder="What needs to be done?" required />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Assign To</label>
          <Select name="userId">
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {organizations.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization</label>
            <Select onValueChange={setSelectedOrg} value={selectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization (optional)" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Project</label>
          <Select name="projectId">
            <SelectTrigger>
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent>
              {filteredProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                  {project.organization && ` (${project.organization.name})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Due Date</label>
          <Input name="dueDate" type="date" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Due Time</label>
          <Input name="dueTime" type="time" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <Select name="priority" defaultValue="MEDIUM">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          name="description"
          placeholder="Add more details about this task..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}

function EditTaskForm({ 
  task,
  projects, 
  organizations,
  teamMembers,
  onCancel, 
  onSubmit 
}: { 
  task: Task;
  projects: Project[]; 
  organizations: Organization[];
  teamMembers: TeamMember[];
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedOrg, setSelectedOrg] = useState<string>(task.project?.organizationId || '');
  const filteredProjects = selectedOrg 
    ? projects.filter(p => p.organizationId === selectedOrg)
    : projects;
  
  const defaultDueDate = task.dueAt ? format(new Date(task.dueAt), 'yyyy-MM-dd') : '';
  const defaultDueTime = task.dueAt ? format(new Date(task.dueAt), 'HH:mm') : '';

  return (
    <form 
      action={(formData) => {
        startTransition(async () => {
          await updateTask(task.id, formData);
          onSubmit();
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Task Name</label>
          <Input name="name" placeholder="What needs to be done?" defaultValue={task.name} required />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Assign To</label>
          <Select name="userId" defaultValue={task.user.id}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {organizations.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization</label>
            <Select onValueChange={setSelectedOrg} value={selectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization (optional)" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Project</label>
          <Select name="projectId" defaultValue={task.project?.id}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent>
              {filteredProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                  {project.organization && ` (${project.organization.name})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Due Date</label>
          <Input name="dueDate" type="date" defaultValue={defaultDueDate} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Due Time</label>
          <Input name="dueTime" type="time" defaultValue={defaultDueTime} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <Select name="priority" defaultValue={task.priority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          name="description"
          placeholder="Add more details about this task..."
          rows={3}
          defaultValue={task.description}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Updating...' : 'Update Task'}
        </Button>
      </div>
    </form>
  );
}
