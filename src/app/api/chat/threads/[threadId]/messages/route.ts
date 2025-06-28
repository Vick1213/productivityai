import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/* ───── GET /api/chat/threads/:threadId/messages ───── */
export async function GET(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  /* capture BEFORE any await */
  const threadId = params.threadId;

  const { searchParams } = new URL(req.url);
  const limit  = Number(searchParams.get("limit") ?? "30");
  const cursor = searchParams.get("cursor");

  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    take:  limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,   //  ← remove if you didn’t add this column
        },
      },
    },
  });

  const nextCursor = messages.length > limit ? messages.pop()!.id : null;
  return NextResponse.json({ messages, nextCursor });
}

/* ───── POST /api/chat/threads/:threadId/messages ───── */
export async function POST(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const threadId = params.threadId;    // ① read sync, *then* do awaits

  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { body, type = "TEXT" } = await req.json();

  const msg = await prisma.$transaction(async (tx) => {
    const message = await tx.chatMessage.create({
      data: { threadId, authorId: user.id, body, type },
      include: { author: true },
    });
    await tx.chatThread.update({
      where: { id: threadId },
      data:  { lastMessageAt: message.createdAt },
    });
    return message;
  });

  return NextResponse.json(msg, { status: 201 });
}
