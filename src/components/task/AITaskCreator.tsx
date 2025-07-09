'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrainIcon, SparklesIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface AITaskCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onTaskCreated?: () => void;
}

export function AITaskCreator({ open, onOpenChange, projects, onTaskCreated }: AITaskCreatorProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    projectId: '',
    priority: 'MEDIUM',
    dueAt: '',
    aiInstructions: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const generateAIHelp = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a task name first');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Help me create a detailed task for: "${form.name}". ${form.projectId ? `This is for project: ${projects.find(p => p.id === form.projectId)?.name}. ` : ''}Suggest a detailed description, appropriate priority level, and AI instructions that would help with task automation and management.`;
      
      const res = await fetch(`/api/assistant?q=${encodeURIComponent(prompt)}`);
      if (!res.ok) throw new Error('Failed to get AI suggestions');
      
      const data = await res.json();
      
      // Parse AI response and extract suggestions (this is a simple implementation)
      const content = data.content || '';
      
      // For demo purposes, we'll just update the description with AI suggestions
      // In a real implementation, you might want to parse the AI response more intelligently
      setForm(prev => ({
        ...prev,
        description: prev.description || content,
        aiInstructions: prev.aiInstructions || `AI suggestions: ${content.slice(0, 200)}...`
      }));
      
      toast.success('AI suggestions added!');
    } catch (error) {
      toast.error('Failed to generate AI suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim() || !form.dueAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const prompt = `Create a task with these details: Name: "${form.name}", Description: "${form.description}", ${form.projectId ? `Project ID: ${form.projectId}, ` : ''}Priority: ${form.priority}, Due date: ${form.dueAt}${form.aiInstructions ? `, AI instructions: ${form.aiInstructions}` : ''}`;
      
      const res = await fetch(`/api/assistant?q=${encodeURIComponent(prompt)}`);
      if (!res.ok) throw new Error('Failed to create task');
      
      const data = await res.json();
      
      toast.success('Task created successfully!');
      setForm({
        name: '',
        description: '',
        projectId: '',
        priority: 'MEDIUM',
        dueAt: '',
        aiInstructions: ''
      });
      onOpenChange(false);
      onTaskCreated?.();
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainIcon className="h-5 w-5" />
            Create Task with AI Assistance
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Task Name *</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter task name..."
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateAIHelp}
                  disabled={isGenerating || !form.name.trim()}
                >
                  {isGenerating ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    <SparklesIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe what needs to be done..."
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="projectId">Project</Label>
              <Select 
                value={form.projectId} 
                onValueChange={(value) => handleSelectChange('projectId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
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

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={form.priority} 
                onValueChange={(value) => handleSelectChange('priority', value)}
              >
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

            <div className="col-span-2">
              <Label htmlFor="dueAt">Due Date *</Label>
              <Input
                id="dueAt"
                name="dueAt"
                type="datetime-local"
                value={form.dueAt}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="aiInstructions">AI Instructions</Label>
              <Textarea
                id="aiInstructions"
                name="aiInstructions"
                value={form.aiInstructions}
                onChange={handleChange}
                placeholder="Special instructions for AI automation and task management..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
