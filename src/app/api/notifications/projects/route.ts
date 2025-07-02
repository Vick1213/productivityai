import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find projects due within 24 hours that aren't completed
    const dueProjects = await prisma.project.findMany({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
        completed: false,
        dueAt: {
          gte: now,
          lte: twentyFourHoursFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        dueAt: true,
      },
      orderBy: {
        dueAt: "asc",
      },
    });

    return NextResponse.json(dueProjects);
  } catch (error) {
    console.error("Error fetching project notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}