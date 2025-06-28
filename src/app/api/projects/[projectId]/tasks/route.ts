// app/api/projects/[projectId]/tasks/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: any                      // keep generic = no build error
) {
  /* await the params object exactly once */
  const { projectId } = await ctx.params;   // ✅ satisfies runtime rule

  const tasks = await prisma.task.findMany({
    where:  { projectId },
    orderBy:{ createdAt: "asc" },
    include:{
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(tasks);
}
