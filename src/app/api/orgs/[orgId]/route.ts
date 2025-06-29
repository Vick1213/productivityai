/* app/api/orgs/[orgId]/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  /* 1️⃣  dynamic segment */
  const orgId = req.nextUrl.pathname.split("/").pop() as string;

  /* 2️⃣  auth */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* 3️⃣  membership via join table (UserOrganization) */
  const membership = await prisma.userOrganization.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  });
  if (!membership)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  /* 4️⃣  fetch organisation + nested data
         ─ users come through join table, so we include user → select fields */
  /* 4️⃣ fetch organisation + nested data */
const org = await prisma.organization.findUnique({
  where: { id: orgId },
  include: {
    /** users is the UserOrganization join rows */
    users: {
      select: {
        role: true,               // ✔ scalar, so use select
        user: {                   // relation, use nested select
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    },
    /** projects + tasks unchanged */
    projects: {
      include: {
        tasks: {
          orderBy: { dueAt: "asc" },
          select: {
            id: true,
            name: true,
            completed: true,
            priority: true,
            dueAt: true,
            userId: true,
          },
        },
      },
    },
  },
});

  if (!org)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  /* 5️⃣  DTO */
  const dto = {
    id: org.id,
    name: org.name,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    members: org.users.map((m) => ({
      id: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      jobTitle: m.user.jobTitle,
      role: m.role ?? "MEMBER",
      avatarUrl: m.user.avatarUrl,
      createdAt: m.user.createdAt,
      updatedAt: m.user.updatedAt,
    })),
    projects: org.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      dueAt: p.dueAt,
      completed: p.completed,
      tasks: p.tasks,
    })),
  };

  return NextResponse.json(dto);
}
