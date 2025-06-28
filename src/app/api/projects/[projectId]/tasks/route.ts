// app/api/projects/[projectId]/tasks/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  ctx: { params: { projectId: string } }
) {
  /* ✅ satisfy the rule */
  const { projectId } = await ctx.params;   // "await" even though it’s sync

  const tasks = await prisma.task.findMany({
    where:  { projectId },
    orderBy:{ createdAt: "asc" },
    include:{
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(tasks);
}
