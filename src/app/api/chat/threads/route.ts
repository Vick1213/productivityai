// app/api/chat/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * GET  ▸ /api/chat/threads
 * List every thread the signed-in user is part of.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const threads = await prisma.chatThread.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: true } },
      messages:     { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return NextResponse.json(threads);
}

/**
 * POST ▸ /api/chat/threads
 * Body: { memberIds: string[] }
 * Returns an existing DM thread if it already exists, otherwise creates one.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { memberIds = [] } = (await req.json()) as { memberIds: string[] };

  const participants = Array.from(new Set([...memberIds, userId])); // de-dup & ensure self

  // ——— 1-to-1 DM?  try to reuse ——————————————————————
  if (participants.length === 2) {
    // Find threads where both users are participants and no one else
    const existingThreads = await prisma.chatThread.findMany({
      where: {
        participants: {
          every: { userId: { in: participants } },
        },
      },
      include: {
        participants: true,
      },
    });

    // Check if any thread has exactly these 2 participants
    const existing = existingThreads.find(
      (thread) => thread.participants.length === 2
    );

    if (existing) return NextResponse.json(existing);
  }

  // ——— otherwise create a new thread ——————————————
  const thread = await prisma.chatThread.create({
    data: {
      organization: {
        connect: { id: await orgIdForUser(userId) }, // helper below
      },
      participants: {
        createMany: {
          data: participants.map((id) => ({ userId: id })),
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(thread, { status: 201 });
}
/* helper: find *one* organisation the user belongs to */
async function orgIdForUser(userId: string) {
  // prefer an explicit primaryOrgId if you kept that column
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryOrgId: true },
  });
  if (user?.primaryOrgId) return user.primaryOrgId;

  // otherwise grab the first membership row
  const membership = await prisma.userOrganization.findFirst({
    where: { userId },
    select: { orgId: true },
  });
  if (!membership) throw new Error("User belongs to no organisation");

  return membership.orgId;
}
