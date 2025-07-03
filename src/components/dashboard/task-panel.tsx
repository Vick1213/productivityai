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
      {/* ------------- title ------------- */}
      <Input name="name" placeholder="New task…" required />

      {/* ------------- start date / time ------------- */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">
            Starts&nbsp;•&nbsp;Date
          </label>
          <Input name="date" type="date" className="w-40" required />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">
            Starts&nbsp;•&nbsp;Time
          </label>
          <Input name="time" type="time" className="w-32" required />
        </div>

        {/* ------------- due date / time ------------- */}
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">
            Due&nbsp;•&nbsp;Date
          </label>
          <Input name="dueDate" type="date" className="w-40" />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">
            Due&nbsp;•&nbsp;Time
          </label>
          <Input name="dueTime" type="time" className="w-32" />
        </div>

        {/* ------------- priority ------------- */}
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">
            Priority
          </label>
          <select
            name="priority"
            defaultValue="LOW"
            className="w-28 rounded-md border p-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <Button type="submit" disabled={loading} className="self-end">
          {loading ? 'Adding…' : 'Add'}
        </Button>
      </div>

      {/* ------------- extras ------------- */}
      <Input
        name="description"
        placeholder="Description (optional)"
        className="w-full"
      />
      <Input
        name="ai"
        placeholder="AI instructions (optional)"
        className="w-full"
      />
    </form>
  );
}

