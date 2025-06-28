// app/api/orgs/[orgId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  /* 1️⃣  extract :orgId from the pathname */
  // pathname example: /api/orgs/abc123
  const segments = req.nextUrl.pathname.split("/");
  const orgId = segments[segments.length - 1]; // "abc123"

  /* 2️⃣  auth */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* 3️⃣  membership guard */
  const isMember = await prisma.organization.findFirst({
    where: { id: orgId, users: { some: { id: userId } } },
    select: { id: true },
  });
  if (!isMember)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  /* 4️⃣  fetch organisation with nested data */
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      users: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      },
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

  /* 5️⃣  map to DTO */
  const dto = {
    id: org.id,
    name: org.name,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    members: org.users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      jobTitle: u.jobTitle,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
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
