'use client'
import { useTransition } from 'react';
import { addTask, toggleTask, deleteTask } from '@/lib/actions/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <Card key={task.id} className={task.completed ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Checkbox
                  defaultChecked={task.completed}
                  onCheckedChange={(v) => startTransition(() => toggleTask(task.id, !!v))}
                />
                <span className="truncate font-semibold text-sm">{task.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              {task.dueDate ? (
                <Badge variant="secondary">Due {format(new Date(task.dueDate), 'MMM d')}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">No due date</span>
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

function AddTaskForm({ loading, onAdd }: { loading: boolean; onAdd: (fd: FormData) => void }) {
  return (
    <form
      action={onAdd}
      className="flex items-end gap-2 md:gap-4"
    >
      <Input
        name="title"
        placeholder="New task…"
        className="flex-1"
        required
      />
      <Input
        name="due"
        type="date"
        className="w-36"
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Adding…' : 'Add'}
      </Button>
    </form>
  );
}
