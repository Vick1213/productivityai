// app/api/projects/[projectId]/tasks/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: any                      // ← keep generic to avoid type error
) {
  const { projectId } = context.params;    // read synchronously

  const tasks = await prisma.task.findMany({
    where:  { projectId },
    orderBy:{ createdAt: "asc" },
    include:{
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(tasks);
}
