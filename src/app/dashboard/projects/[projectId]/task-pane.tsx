/* app/(dashboard)/projects/[projectId]/tasks-pane.tsx */
"use client";

import { useProjectTasks } from "@/lib/hooks/useProjectTasks";
import { AddTaskDrawer } from "@/components/task/AddTaskDrawer";
import { AssignUserSelect } from "@/components/task/AssignUserSelect";
import { useMemo } from "react";
import useSWR from "swr";
import { Task } from "@prisma/client";

export function TasksPane({
  projectId,
  orgId,
}: {
  projectId: string;
  orgId: string;
}) {
  const { tasks, mutate, isLoading } = useProjectTasks(projectId);

  // memoised members list for the drawer
  const { members } = useOrgMembers(orgId);        // small helper hook

  if (isLoading) return <p>Loading tasks…</p>;

  return (
    <>
      <AddTaskDrawer
        projectId={projectId}
        members={members}
        // Either update AddTaskDrawer component to accept this prop, or remove it
      />

      {tasks.length === 0 ? (
        <p className="mt-4 text-muted-foreground text-sm">
          No tasks yet. Use <b>+ New task</b> to add the first one.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((t:Task) => (
            <li key={t.id} className="flex items-center justify-between">
              <span>{t.name}</span>
              <AssignUserSelect
                taskId={t.id}
                projectId={projectId}
                members={members}
                currentId={t.userId}
                onChange={() => mutate()}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* 🪄 simple member-fetch hook */
function useOrgMembers(orgId: string) {
  const res = useSWR(`/api/orgs/${orgId}/members`, (u) =>
    fetch(u).then((r) => r.json())
  );
  return { members: res.data ?? [] };
}
