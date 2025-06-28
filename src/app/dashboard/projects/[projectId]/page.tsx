/* app/(dashboard)/projects/[projectId]/page.tsx */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { TasksPane } from "./task-pane";
import { Badge } from "@/components/ui/badge";

/* helper: human-readable remaining time */
function dueCountdown(due: Date | null) {
  if (!due) return null;
  const diff = +due - Date.now();
  if (diff <= 0) return "Overdue";
  const h = Math.floor(diff / 3_600_000);
  return h < 24 ? `Due in ${h} h` : `Due in ${Math.ceil(h / 24)} days`;
}

/* server action: toggle project.completed */
async function toggleCompletion(fd: FormData) {
  "use server";
  const id = fd.get("id") as string;
  const completed = fd.get("completed") === "on";
  await prisma.project.update({ where: { id }, data: { completed } });
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  /* read params sync → no runtime warning */
  const { projectId } = params;

  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    include: { users: true },
  });
  if (!project) notFound();

  const dueLabel = dueCountdown(project.dueAt);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      {/* ← Back */}
      <Link
        href="/dashboard/team"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        aria-label="Back to team"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to team
      </Link>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold">{project.name}</h1>

          {dueLabel && (
            <Badge
              variant={dueLabel === "Overdue" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {dueLabel}
            </Badge>
          )}

          {project.completed && (
            <Badge variant="outline" className="text-xs text-green-700">
              ✓ Done
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground">{project.description ?? " "}</p>
      </header>

      {/* Tasks list */}
      <Suspense fallback={<p className="text-sm">Loading tasks…</p>}>
        <TasksPane projectId={project.id} orgId={project.organizationId!} />

        {/* Completion toggle */}
        <form
          action={toggleCompletion}
          className="mt-6 flex items-center gap-2"
        >
          <input type="hidden" name="id" value={project.id} />
          <input
            type="checkbox"
            name="completed"
            defaultChecked={project.completed}
            className="h-4 w-4"
            aria-label={project.completed ? "Mark project incomplete" : "Mark project complete"}
          />
          <span className="text-sm">Mark complete</span>
        </form>
      </Suspense>
    </main>
  );
}
