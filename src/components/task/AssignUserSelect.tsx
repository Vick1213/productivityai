// components/task/AssignUserSelect.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Member } from "@/types/team";
import { Badge } from "@/components/ui/badge";

interface Props {
  taskId: string;
  projectId: string;
  members: Member[];
  currentId: string | null;
  onChange: (newId: string) => void;
}

export function AssignUserSelect({
  taskId,
  projectId,
  members,
  currentId,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLUListElement>(null);

  /* ── close on outside click / Esc ───────────────────── */
  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent | KeyboardEvent) {
      if (
        e instanceof MouseEvent &&
        popRef.current &&
        !popRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
      if (e instanceof KeyboardEvent && e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  /* ── assign helper ───────────────────────────────────── */
  async function assign(userId: string) {
    setOpen(false);                   // 1️⃣ close immediately
    onChange(userId);                 // optimistic update
    // fire-and-forget—handle errors as you like
    fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }

  const current = members.find((m) => m.id === currentId);

  return (
    <div className="relative">
      <Badge
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();        // prevent parent link clicks
          setOpen((o) => !o);
        }}
      >
        {current ? current.firstName : "Unassigned"}
      </Badge>

      {open && (
        <ul
          ref={popRef}
          className="absolute z-10 mt-1 w-40 rounded border bg-background shadow"
        >
          {members.map((m) => (
            <li
              key={m.id}
              className="cursor-pointer px-3 py-1 text-sm hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();   // keep card/link passive
                assign(m.id);
              }}
            >
              {m.firstName} {m.lastName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
