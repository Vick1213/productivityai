/* app/api/orgs/[orgId]/members/route.ts */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/* GET /api/orgs/:orgId/members */
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.pathname.split("/").slice(-2)[0];

  /* 1️⃣ auth */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* 2️⃣ membership guard via UserOrganization */
  const membership = await prisma.userOrganization.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { userId: true },
  });
  if (!membership)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  /* 3️⃣ members list (join rows) */
  const rows = await prisma.userOrganization.findMany({
    where: { orgId },
    select: {
      role: true,                 // scalar → select
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { user: { firstName: "asc" } },
  });

  const members = rows.map((r) => ({
    id: r.user.id,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    avatarUrl: r.user.avatarUrl,
    role: r.role ?? "MEMBER",
  }));

  return NextResponse.json(members);
}

export async function PATCH(req: NextRequest) {
  const orgId = req.nextUrl.pathname.split("/").slice(-2)[0];
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  
  // Check if current user is an owner
  const currentUserMembership = await prisma.userOrganization.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  });
  
  if (!currentUserMembership || currentUserMembership.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can update roles" }, { status: 403 });
  }
  
  const { userId: targetUserId, role } = await req.json();
  
  // Validate role
  if (!["OWNER", "ADMIN", "SALES_MANAGER", "CAMPAIGN_MANAGER", "PROJECT_LEAD", "MEMBER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  
  try {
    await prisma.userOrganization.update({
      where: { userId_orgId: { userId: targetUserId, orgId } },
      data: { role },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user role:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
} 