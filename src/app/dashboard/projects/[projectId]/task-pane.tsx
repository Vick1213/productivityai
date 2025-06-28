/* app/(dashboard)/projects/[projectId]/tasks-pane.tsx */
"use client";

import { useProjectTasks } from "@/lib/hooks/useProjectTasks";
import { AddTaskDrawer } from "@/components/task/AddTaskDrawer";
import { AssignUserSelect } from "@/components/task/AssignUserSelect";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import useSWR from "swr";
import { Task } from "@prisma/client";

/* helper – nice due label */
function humanDue(d: Date | null) {
  if (!d) return null;
  if (isPast(d) && !isToday(d)) return "Overdue";
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

export function TasksPane({
  projectId,
  orgId,
}: {
  projectId: string;
  orgId: string;
}) {
  const { tasks, mutate, isLoading } = useProjectTasks(projectId);
  const { members } = useOrgMembers(orgId);

  if (isLoading) return <Skeleton className="h-5 w-24" />;

  /* split + sort */
  const open   = [...tasks].filter((t) => !t.completed).sort(byDue);
  const closed = [...tasks].filter((t) =>  t.completed).sort(byDue);

  return (
    <div className="space-y-10">
      {/* quick-add button */}
      <AddTaskDrawer projectId={projectId} members={members} />

      <TaskSection
        title="Open tasks"
        items={open}
        members={members}
        mutate={mutate}
        showAssign
        projectId={projectId}
      />
      <TaskSection title="Completed" items={closed} muted projectId={projectId} />
    </div>
  );
}

/* — section component — */
function TaskSection({
  title,
  items,
  members,
  mutate,
  muted = false,
   projectId,

  showAssign = false,
}: {
  title: string;
  items: Task[];
  members?: any[];
  mutate?: () => void;
  muted?: boolean;
  projectId: string;
  showAssign?: boolean;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here!</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => {
            const dueText = humanDue(t.dueAt);
            return (
              <li
                key={t.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  muted ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={
                      t.completed ? "line-through text-muted-foreground" : ""
                    }
                  >
                    {t.name}
                  </span>
                  {dueText && (
                    <span className="text-xs text-muted-foreground">
                      {dueText}
                    </span>
                  )}
                </div>

                {showAssign && (
                  <AssignUserSelect
                    taskId={t.id}
                    projectId={projectId}
                    members={members!}
                    currentId={t.userId}
                    onChange={() => mutate?.()}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* utility */
function byDue(a: Task, b: Task) {
  if (!a.dueAt) return 1;
  if (!b.dueAt) return -1;
  return +a.dueAt - +b.dueAt;
}

/* small helper hook – unchanged */
function useOrgMembers(orgId: string) {
  const { data } = useSWR(`/api/orgs/${orgId}/members`, (u) =>
    fetch(u).then((r) => r.json())
  );
  return { members: data ?? [] };
}
