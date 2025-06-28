// app/api/chat/threads/[threadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * GET  ▸ /api/chat/threads/:threadId
 * Returns the thread meta, participants, and the newest message.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: params.threadId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,                       // newest only
        include: { author: true },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  return NextResponse.json(thread);
}

/**
 * PATCH ▸ /api/chat/threads/:threadId
 * Let the caller rename the thread or add/remove participants.
 *
 * {
 *   "title": "Product Launch",
 *   "addUserIds":    ["abc", "xyz"],
 *   "removeUserIds": ["lmn"]
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { title, addUserIds = [], removeUserIds = [] } = await req.json();

  const data: any = {};
  if (title !== undefined) data.title = title;

  // Prepare nested updates only if arrays are non-empty
  if (addUserIds.length || removeUserIds.length) {
    data.participants = {
      ...(addUserIds.length && {
        createMany: {
          data: addUserIds.map((id: string) => ({ userId: id })),
          skipDuplicates: true,
        },
      }),
      ...(removeUserIds.length && {
        deleteMany: removeUserIds.map((id: string) => ({ userId: id })),
      }),
    };
  }

  const updated = await prisma.chatThread.update({
    where: { id: params.threadId },
    data,
    include: {
      participants: { include: { user: true } },
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE ▸ /api/chat/threads/:threadId
 * Soft-delete: only mark as deleted for now (safer for audit/history).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  // Replace with hard delete if you prefer
  await prisma.chatThread.update({
    where: { id: params.threadId },
    data: { deletedAt: new Date() },      // add this nullable column if desired
  });

  return NextResponse.json({ ok: true });
}
