import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // If 'since' is provided, only return tasks that became overdue/due after that time
    const sinceDate = since ? new Date(since) : new Date(now.getTime() - 60 * 60 * 1000); // Default to last hour

    // Find tasks that need reminders
    const taskReminders = await prisma.task.findMany({
      where: {
        userId: userId,
        completed: false,
        OR: [
          // Tasks due within 24 hours (only new ones if since is provided)
          {
            dueAt: {
              gte: now,
              lte: twentyFourHoursFromNow,
            },
            // Only include if task's due date entered the 24-hour window recently
            ...(since && {
              updatedAt: {
                gte: sinceDate
              }
            })
          },
          // Tasks starting within 2 hours
          {
            startsAt: {
              gte: now,
              lte: twoHoursFromNow,
            },
            // Only include if task's start time entered the 2-hour window recently
            ...(since && {
              updatedAt: {
                gte: sinceDate
              }
            })
          },
          // Overdue tasks (be more conservative - only show if recently became overdue or high priority)
          {
            dueAt: {
              lt: now,
              // For overdue tasks, only include if they became overdue recently OR they're high priority
              ...(since ? {
                gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Only overdue in last 24 hours
              } : {
                gte: new Date(now.getTime() - 60 * 60 * 1000) // Only overdue in last hour for first load
              })
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
    const now2 = new Date(); // Fresh now for categorization
    const categorizedTasks = {
      overdue: taskReminders.filter(task => 
        task.dueAt < now2 && 
        // Only notify for high priority overdue tasks or recently overdue tasks
        (task.priority === 'HIGH' || (task.dueAt && task.dueAt > new Date(now2.getTime() - 24 * 60 * 60 * 1000)))
      ),
      dueSoon: taskReminders.filter(task => 
        task.dueAt >= now2 && task.dueAt <= twentyFourHoursFromNow
      ),
      startingSoon: taskReminders.filter(task => 
        task.startsAt >= now2 && task.startsAt <= twoHoursFromNow
      ),
    };

    return NextResponse.json(categorizedTasks);
  } catch (error) {
    console.error("Error fetching task notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}