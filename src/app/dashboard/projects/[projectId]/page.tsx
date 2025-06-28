/* app/(dashboard)/projects/[projectId]/page.tsx */
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Suspense } from "react";
import { TasksPane } from "./task-pane";

export default async function ProjectPage({ params }: any) {
  // satisfy Next’s “params should be awaited” rule
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { users: true },
  });
  if (!project) notFound();

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">{project.name}</h1>
      <p className="text-muted-foreground">{project.description ?? " "}</p>

      <Suspense fallback={<p>Loading tasks…</p>}>
        <TasksPane projectId={project.id} orgId={project.organizationId!} />
      </Suspense>
    </div>
  );
}
