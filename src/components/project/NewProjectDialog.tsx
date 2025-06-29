// components/project/NewProjectDialog.tsx
"use client";

import { startTransition, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createProject } from "@/lib/actions/createProject";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Member } from "@/types/team";
export function NewProjectDialog({
  members,
  onSuccess,
  currentOrgId,
}: {
  members: Member[];
  onSuccess: () => void;
  currentOrgId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handle(data: FormData) {
    startTransition(async () => {
      const res = await createProject(data); // now only name/desc/memberIds
      if ('error' in res) { toast.error(res.error); return; }
      toast.success("Project created");
      setOpen(false);
      onSuccess();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ New project</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>

        <form action={handle} className="grid gap-4">
          {/* basic fields */}
          <Input required name="name" placeholder="Project name" />
          <Textarea name="description" placeholder="Description" rows={3} />

          {/* select members */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Members</p>
            <div className="max-h-32 overflow-y-auto space-y-1 pl-1">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2">
                  <Checkbox name="memberIds" value={m.id} />
                  <span className="text-sm truncate">
                    {m.firstName} {m.lastName}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
    <input type="date" name="dueDate" className="border rounded px-3 py-2" />
    <input type="time" name="dueTime" className="border rounded px-3 py-2" />
    <input type="hidden" name="orgId" value={currentOrgId} />

    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="completed" />
      Completed
    </label>
  </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

