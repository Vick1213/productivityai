'use client';

import { useTransition } from 'react';
import { createProject } from '@/lib/actions/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Props {
  unassignedTasks: {
    id: string;
    name: string;
    description: string;
  }[];
}

export default function CreateProjectForm({ unassignedTasks }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleAction = async (formData: FormData) => {
    startTransition(async () => {
      const res = await createProject(formData);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Project created');
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New project</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleAction} className="grid gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Project name</label>
            <Input name="name" placeholder="Website redesign" required />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Description</label>
            <Textarea name="description" rows={3} />
          </div>

          {/* Existing tasks */}
          {unassignedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Attach existing tasks</p>
              <div className="space-y-1 pl-1">
                {unassignedTasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2">
                    <Checkbox name="taskIds" value={t.id} />
                    <span className="truncate text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Quick‑add first task */}
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Create first task (optional)</p>
            <Input
              name="newTaskName"
              placeholder="e.g. Draft project roadmap"
            />
            <Textarea
              name="newTaskDescription"
              placeholder="Task description"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Creating…' : 'Create project'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
