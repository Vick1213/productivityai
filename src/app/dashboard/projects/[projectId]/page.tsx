/* app/(dashboard)/projects/[projectId]/page.tsx */
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Suspense } from "react";
import { TasksPane } from "./task-pane";  // extract into its own client file

export default async function ProjectPage({
  params,
}: { params: { projectId: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      users: true,
    },
  });
  if (!project) notFound();

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">{project.name}</h1>
      <p className="text-muted-foreground">{project.description ?? " "}</p>

      <Suspense fallback={<p>Loading tasks…</p>}>
        {/* client component handles fetching & zero-state */}
        <TasksPane projectId={project.id} orgId={project.organizationId!} />
      </Suspense>
    </div>
  );
}
