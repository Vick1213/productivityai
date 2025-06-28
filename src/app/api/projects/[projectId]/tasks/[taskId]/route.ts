// app/api/projects/[projectId]/tasks/[taskId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { projectId: string; taskId: string } }
) {
  const { userId } = await req.json() as { userId: string };

  const task = await prisma.task.update({
    where: { id: params.taskId, projectId: params.projectId },
    data:  { userId },
    include: { user: true },
  });

  return NextResponse.json(task);
}
