// components/task/AddTaskDrawer.tsx
"use client";
import { useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addTask } from "@/lib/actions/tasks"; // server action import

export function AddTaskDrawer({
  projectId,
  members,
  triggerProps,
}: {
  projectId: string;
  members: { id: string; firstName: string; lastName: string }[];
  triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" {...triggerProps}>+ New task</Button>
        <Button size="sm">+ New task</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New task</DrawerTitle>
        </DrawerHeader>

        <form
          action={async (fd) => {
            await addTask(fd); // server action import
            setOpen(false);
          }}
          className="grid gap-4 p-4"
        >
          <input type="hidden" name="projectId" value={projectId} />

          <Input name="name" placeholder="Task name" required />
          <Textarea name="description" placeholder="Description" rows={3} />

          <select name="userId" className="border rounded px-3 py-2">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>

          <Button type="submit">Create</Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
