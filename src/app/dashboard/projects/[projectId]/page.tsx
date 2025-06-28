/* app/(dashboard)/projects/[projectId]/page.tsx */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { TasksPane } from "./task-pane";

/* helper: human-readable remaining time */
function dueCountdown(due: Date | null) {
  if (!due) return null;
  const ms = +due - Date.now();
  if (ms <= 0) return "Overdue";
  const h = Math.floor(ms / 3_600_000);
  return h < 24 ? `Due in ${h} h` : `Due in ${Math.ceil(h / 24)} days`;
}

export default async function ProjectPage({ params }: any) {
  const { projectId } = await params;                 // appease runtime rule

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { users: true },
  });
  if (!project) notFound();

  const dueLabel = dueCountdown(project.dueAt);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* ── header ────────────────────── */}
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {dueLabel && (
          <span
            className={`text-xs px-2 py-0.5 rounded
              ${dueLabel === "Overdue" ? "bg-red-200 text-red-800"
                                       : "bg-muted text-muted-foreground"}`}
          >
            {dueLabel}
          </span>
        )}
        {project.completed && (
          <span className="text-xs px-2 py-0.5 rounded bg-green-200 text-green-800">
            ✓ Done
          </span>
        )}
      </div>
      <p className="text-muted-foreground">{project.description ?? " "}</p>

      {/* ── tasks + completion toggle ─── */}
      <Suspense fallback={<p>Loading tasks…</p>}>
        <TasksPane projectId={project.id} orgId={project.organizationId!} />

        <form action={toggleCompletion} className="flex items-center gap-2 mt-6">
          <input type="hidden" name="id" value={project.id} />
          <input
            type="checkbox"
            name="completed"
            defaultChecked={project.completed}
            className="h-4 w-4"
          />
          <span className="text-sm">Mark complete</span>
        </form>
      </Suspense>
    </div>
  );
}

/* server action: toggle project.completed */
async function toggleCompletion(fd: FormData) {
  "use server";
  const id = fd.get("id") as string;
  const completed = fd.get("completed") === "on";
  await prisma.project.update({
    where: { id },
    data: { completed },
  });
}
