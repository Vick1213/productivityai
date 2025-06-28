// app/api/projects/[projectId]/tasks/[taskId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: any         // ✅ generic to satisfy Next’s validator
) {
  const { projectId, taskId } = context.params;  // read sync

  const { userId } = (await req.json()) as { userId: string };

  const task = await prisma.task.update({
    where: { id: taskId, projectId },
    data:  { userId },
    include: { user: true },
  });

  return NextResponse.json(task);
}
