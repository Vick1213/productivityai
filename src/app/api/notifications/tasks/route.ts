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
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find tasks that need reminders
    const taskReminders = await prisma.task.findMany({
      where: {
        userId: userId,
        completed: false,
        OR: [
          // Tasks due within 24 hours
          {
            dueAt: {
              gte: now,
              lte: twentyFourHoursFromNow,
            },
          },
          // Tasks starting within 2 hours
          {
            startsAt: {
              gte: now,
              lte: twoHoursFromNow,
            },
          },
          // Overdue tasks
          {
            dueAt: {
              lt: now,
            },
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          dueAt: "asc",
        },
        {
          startsAt: "asc",
        },
      ],
      take: 10, // Limit to prevent overwhelming notifications
    });

    // Categorize tasks for better notification handling
    const categorizedTasks = {
      overdue: taskReminders.filter(task => task.dueAt < now),
      dueSoon: taskReminders.filter(task => 
        task.dueAt >= now && task.dueAt <= twentyFourHoursFromNow
      ),
      startingSoon: taskReminders.filter(task => 
        task.startsAt >= now && task.startsAt <= twoHoursFromNow
      ),
    };

    return NextResponse.json(categorizedTasks);
  } catch (error) {
    console.error("Error fetching task notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}