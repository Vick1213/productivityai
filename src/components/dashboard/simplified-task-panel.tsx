'use client';

import { useState, useRef, useTransition } from 'react';
import { addTask, toggleTask, deleteTask } from '@/lib/actions/tasks';
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
import { Plus, MessageSquare, Calendar, Clock, Trash2 } from 'lucide-react';
import { AudioTaskCreator } from './audio-task-creator';

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
  };
}

interface Project {
  id: string;
  name: string;
}

interface SimplifiedTaskPanelProps {
  tasks: Task[];
  projects: Project[];
}

export function SimplifiedTaskPanel({ tasks, projects }: SimplifiedTaskPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAudioCreator, setShowAudioCreator] = useState(false);
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
      
      // Debug: log the response to understand the structure
      console.log('AI Assistant Response:', data);
      
      // The API returns the OpenAI message object with content property
      const aiContent = data.content || data.response || JSON.stringify(data) || 'Task processed successfully!';
      setAiResponse(aiContent);
      setAiMessage(''); // Clear input after successful request
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
        body: JSON.stringify({ prompt: `Please create a task based on this voice input: "${transcription}"` }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process voice input');
      }
      
      // Handle the OpenAI response format
      const aiContent = data.content || data.response || 'Voice input processed successfully!';
      setAiResponse(aiContent);
      setAiMessage(''); // Clear the input after processing
    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAiResponse(`Voice transcribed: "${transcription}"\n\nError processing: ${errorMessage}\n\nPlease review and send manually.`);
    }
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`transition-all hover:shadow-md ${task.completed ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => 
              startTransition(() => toggleTask(task.id, !!checked))
            }
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.name}
            </h3>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              {task.project && (
                <Badge variant="secondary" className="text-xs">
                  {task.project.name}
                </Badge>
              )}
              {task.dueAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.dueAt), 'MMM d, h:mm a')}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTransition(() => deleteTask(task.id))}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TaskSection = ({ title, tasks, color }: { title: string; tasks: Task[]; color: string }) => (
    <div className="space-y-3">
      <h2 className={`text-lg font-semibold flex items-center gap-2 ${color}`}>
        <Calendar className="h-5 w-5" />
        {title} ({tasks.length})
      </h2>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks with AI assistance</p>
        </div>
        <div className="flex gap-2">
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

      {/* Create Task Form */}
      {showCreateForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg">Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateTaskForm
              projects={projects}
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
          <TaskSection title="Overdue" tasks={dueTasks} color="text-red-600" />
        )}
        
        {todayTasks.length > 0 && (
          <TaskSection title="Due Today" tasks={todayTasks} color="text-orange-600" />
        )}
        
        {tomorrowTasks.length > 0 && (
          <TaskSection title="Due Tomorrow" tasks={tomorrowTasks} color="text-blue-600" />
        )}
        
        {upcomingTasks.length > 0 && (
          <TaskSection title="Upcoming" tasks={upcomingTasks} color="text-gray-600" />
        )}
        
        {completedTasks.length > 0 && (
          <TaskSection title="Completed" tasks={completedTasks} color="text-green-600" />
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
  onCancel, 
  onSubmit 
}: { 
  projects: Project[]; 
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [isPending, startTransition] = useTransition();

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
          <label className="text-sm font-medium">Project</label>
          <Select name="projectId">
            <SelectTrigger>
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
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
