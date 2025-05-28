'use client';

import { useTransition } from 'react';
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
import { format } from 'date-fns';

export function TaskPanel({ tasks }: { tasks: any[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <section className="grid gap-6 p-6">
      <AddTaskForm loading={isPending} onAdd={(fd) => startTransition(() => addTask(fd))} />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id} className={task.completed ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Checkbox
                  defaultChecked={task.completed}
                  onCheckedChange={(v) => startTransition(() => toggleTask(task.id, !!v))}
                />
                <span className="truncate text-sm font-semibold">{task.name}</span>
              </CardTitle>
            </CardHeader>

            <CardDescription>
              <span className="ml-6 truncate text-sm font-semibold">{task.description}</span>
            </CardDescription>
            <CardContent className="flex items-center justify-between">
              {task.dueDate ? (
                <Badge variant="secondary">
                  Due {format(new Date(task.dueDate), 'MMM d')}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">No due date</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startTransition(() => deleteTask(task.id))}
              >
                🗑️
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function AddTaskForm({
  loading,
  onAdd,
}: {
  loading: boolean;
  onAdd: (fd: FormData) => void;
}) {
  return (
    <form action={onAdd} className="flex flex-col gap-4">
      <Input name="title" placeholder="New task…" className="flex-1" required />

      <div className="flex flex-wrap items-end gap-4">
        {/* Start date/time */}
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">Starts</label>
          <Input name="start" type="datetime-local" className="w-56" required />
        </div>

        {/* Due date/time */}
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">Due</label>
          <Input name="due" type="datetime-local" className="w-56" />
        </div>

        <Button type="submit" disabled={loading} className="self-end">
          {loading ? 'Adding…' : 'Add'}
        </Button>
      </div>

      <Input name="description" placeholder="Add description" className="w-full" />
    </form>
  );
}
