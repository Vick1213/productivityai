import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    // Get messages from the last 2 minutes that the user hasn't sent
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const newMessages = await prisma.chatMessage.findMany({
      where: {
        createdAt: {
          gte: twoMinutesAgo,
        },
        authorId: {
          not: userId, // Don't notify about own messages
        },
        thread: {
          participants: {
            some: {
              userId: userId, // Only messages in threads user is part of
            },
          },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        thread: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5, // Limit to prevent spam
    });

    return NextResponse.json(newMessages);
  } catch (error) {
    console.error("Error fetching chat notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}