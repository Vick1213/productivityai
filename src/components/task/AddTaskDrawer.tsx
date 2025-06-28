'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { addTask } from '@/lib/actions/tasks';

interface Member { id: string; firstName: string; lastName: string }

interface Props {
  projectId: string;
  members: Member[];
  onCreated?: () => void;
  triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export function AddTaskDrawer({
  projectId,
  members,
  onCreated,
  triggerProps,
}: Props) {
  const [open, setOpen] = useState(false);

  async function handle(fd: FormData) {
    await addTask(fd);
    onCreated?.();
    setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* ── TRIGGER (stop bubbling) ────────────────── */}
      <DrawerTrigger asChild>
        <Button
          size="sm"
          {...triggerProps}
          onClick={(e) => {
            e.stopPropagation();
            triggerProps?.onClick?.(e);
            setOpen(true);
          }}
        >
          + New task
        </Button>
      </DrawerTrigger>

      {/* ── DRAWER FORM ────────────────────────────── */}
      <DrawerContent onClick={(e) => e.stopPropagation()}>
        <DrawerHeader>
          <DrawerTitle>New task</DrawerTitle>
        </DrawerHeader>

        <form action={handle} className="grid gap-4 p-4">
          <input type="hidden" name="projectId" value={projectId} />

          <Input name="name" placeholder="Task name" required />
          <Textarea name="description" placeholder="Description" rows={3} />

          {/* user picker — stop bubbling so it’s fully clickable */}
          <select
            name="userId"
            className="border rounded px-3 py-2"
            defaultValue={members[0]?.id ?? ''}
            onClick={(e) => e.stopPropagation()}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>

          {/* optional due-at */}
          <div className="flex gap-2">
            <input type="date" name="dueDate" className="border rounded px-3 py-2 flex-1" />
            <input type="time" name="dueTime" className="border rounded px-3 py-2 w-[110px]" />
          </div>

          <select name="priority" className="border rounded px-3 py-2">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          <Button type="submit">Create</Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
