/* app/api/team/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { v4 as uuid } from "uuid";

const resend = new Resend(process.env.RESEND_API_KEY!);

/* ───────────────────────── helpers ────────────────────────── */
const toDTO = (org: NonNullable<any>) => ({
  id: org.id,
  name: org.name,
  createdAt: org.createdAt,
  updatedAt: org.updatedAt,

  /* members come through join rows */
  members: org.users.map((row: any) => ({
    id: row.user.id,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    email: row.user.email,
    jobTitle: row.user.jobTitle,
    role: row.role ?? "MEMBER",
    avatarUrl: row.user.avatarUrl,
    createdAt: row.user.createdAt,
    updatedAt: row.user.updatedAt,
  })),

  projects: org.projects.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    tasks: p.tasks.map((t: any) => ({
      id: t.id,
      name: t.name,
      completed: t.completed,
      priority: t.priority,
      dueAt: t.dueAt,
      userId: t.userId,
    })),
  })),
});

/* ─────────────────────────  GET  /api/team  ───────────────────────── */
export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* 1️⃣  pick the user’s “current” org
        – prefer primaryOrgId, else first membership               */
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryOrgId: true },
  });

  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId,
      ...(user?.primaryOrgId && { orgId: user.primaryOrgId }),
    },
    select: { orgId: true },
  });

  if (!membership)
    return NextResponse.json(null); // not in any org yet

  const orgId = membership.orgId;

  /* 2️⃣  fetch org + nested data through join table               */
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      users: {
        select: {
          role: true,
          user: {
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

  return NextResponse.json(toDTO(org));
}

/* ─────────────────────────  POST  /api/team  ─────────────────────────
   Body: { name: string }
   Creates new org & makes caller OWNER
--------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { name = "" } = (await req.json()) as { name?: string };
  if (!name.trim())
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 422 }
    );

  /* forbid duplicate name for this user (optional) */
  const already = await prisma.userOrganization.findMany({
    where: { userId },
    include: { organization: true },
  });
  if (already.some((m) => m.organization.name === name.trim()))
    return NextResponse.json(
      { error: "You already have an organisation with this name" },
      { status: 409 }
    );

  /* create org + join row in one TX */
  let org;
  try {
    org = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: name.trim() },
      });

      await tx.userOrganization.create({
        data: { userId, orgId: org.id, role: "OWNER" },
      });

      await tx.user.update({
        where: { id: userId },
        data: { primaryOrgId: org.id },
      });

      return org;
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to create organisation" },
      { status: 500 }
    );
  }

  /* optional “welcome” e-mail */
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email && process.env.FROM_EMAIL) {
      await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: user.email,
        subject: `🎉 You just created “${org.name}”`,
        html: `
          <h2>Welcome to your new team: ${org.name}</h2>
          <p>You’re all set – start inviting team-mates and creating projects.</p>
        `,
      });
    }
  } catch (mailErr) {
    console.error("Resend mail error:", mailErr);
  }

  /* return fresh DTO */
  const fullOrg = await prisma.organization.findUnique({
    where: { id: org.id },
    include: {
      users: { include: { user: true } },
      projects: true,
    },
  });

  return NextResponse.json(toDTO(fullOrg), { status: 201 });
}
