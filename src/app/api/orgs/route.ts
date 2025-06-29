/* app/api/orgs/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/orgs
 *
 * Lists every organisation the signed-in user belongs to, together with
 * member/project counts (for the org-picker UI).
 */
export async function GET(_req: NextRequest) {
  /* 1️⃣  Auth ---------------------------------------------------- */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* 2️⃣  Orgs via join table ------------------------------------ */
  const orgs = await prisma.organization.findMany({
    where: {                 // ↴ via UserOrganization join rows
      users: { some: { userId } },
    },
    select: {
      id: true,
      name: true,
      _count: {              // fast counts in the same query
        select: { users: true, projects: true },
      },
    },
    orderBy: { name: "asc" },
  });

  /* 3️⃣  Map to DTO --------------------------------------------- */
  const dto = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    membersCount: o._count.users,     // users = join-rows
    projectsCount: o._count.projects,
  }));

  return NextResponse.json(dto);
}
