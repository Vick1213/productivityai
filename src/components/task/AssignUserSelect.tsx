// components/task/AssignUserSelect.tsx
"use client";
import { useState } from "react";
import { Member } from "@/types/team";
import { Badge } from "@/components/ui/badge";

export function AssignUserSelect({
  taskId,
  projectId,
  members,
  currentId,
  onChange,
}: {
  taskId: string;
  projectId: string;
  members: Member[];
  currentId: string | null;
  onChange: (newId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  async function assign(userId: string) {
    await fetch(
      `/api/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }
    );
    onChange(userId);
    setOpen(false);
  }

  const current = members.find((m) => m.id === currentId);

  return (
    <div className="relative">
      <Badge onClick={() => setOpen(!open)} className="cursor-pointer">
        {current ? `${current.firstName}` : "Unassigned"}
      </Badge>
      {open && (
        <ul className="absolute z-10 mt-1 w-40 rounded border bg-background shadow">
          {members.map((m) => (
            <li
              key={m.id}
              className="cursor-pointer px-3 py-1 text-sm hover:bg-muted"
              onClick={() => assign(m.id)}
            >
              {m.firstName} {m.lastName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
