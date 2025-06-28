
"use server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/* GET /api/orgs/:orgId/members */
export async function GET(
  _req: Request,
  ctx: { params: { orgId: string } }
) {
  // lint-satisfying copy
  const { orgId } = await ctx.params;

  /* — 1) auth check — */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* — 2) ensure caller belongs to this org — */
  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (caller?.organizationId !== orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  /* — 3) fetch members — */
  const members = await prisma.user.findMany({
    where: { organizationId: orgId },
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
    },
  });

  return NextResponse.json(members, { status: 200 });
}
