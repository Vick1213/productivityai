import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/orgs
 *
 * Returns every organisation the signed-in user belongs to,
 * plus quick counts used by the picker UI.
 */
export async function GET() {
  /* 1️⃣  Auth */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* 2️⃣  Find orgs with member & project counts */
  const orgs = await prisma.organization.findMany({
    where: { users: { some: { id: userId } } },
    select: {
      id: true,
      name: true,
      _count: {
        select: { users: true, projects: true },
      },
    },
    orderBy: { name: "asc" },
  });

  /* 3️⃣  Map to the summary DTO expected by useAllOrganisations() */
  const dto = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    membersCount: o._count.users,
    projectsCount: o._count.projects,
  }));

  return NextResponse.json(dto);
}
