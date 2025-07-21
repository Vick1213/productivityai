import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { sendTaskReminderEmail, shouldSendTaskReminder } from '@/lib/email';
import { Task, User, Project, Organization } from '@prisma/client';

type TaskWithRelations = Task & {
  user: User;
  project?: (Project & { 
    organization?: Organization | null 
  }) | null;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all high priority tasks that are due soon or overdue
    const tasks = await prisma.task.findMany({
      where: {
        priority: 'HIGH',
        completed: false,
        dueAt: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Due within 24 hours
        }
      },
      include: {
        user: true,
        project: {
          include: {
            organization: true
          }
        }
      }
    });

    console.log(`Found ${tasks.length} high priority tasks due within 24 hours`);

    const emailResults = [];
    
    for (const task of tasks) {
      if (shouldSendTaskReminder(task)) {
        const result = await sendTaskReminderEmail(task);
        emailResults.push({
          taskId: task.id,
          taskName: task.name,
          userEmail: task.user.email,
          ...result
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${tasks.length} tasks, sent ${emailResults.filter(r => r.success).length} emails`,
      results: emailResults
    });

  } catch (error) {
    console.error('Error sending task reminder emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's tasks that would trigger email notifications
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: userId,
        priority: 'HIGH',
        completed: false,
        dueAt: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        project: {
          include: {
            organization: true
          }
        }
      }
    });

    const tasksWithUser = tasks.map(task => ({ ...task, user }));
    const eligibleTasks = tasksWithUser
      .filter((task) => shouldSendTaskReminder(task))
      .map((task) => ({
        id: task.id,
        name: task.name,
        dueAt: task.dueAt,
        priority: task.priority,
        project: task.project?.name,
        organization: task.project?.organization?.name
      }));

    return NextResponse.json({
      eligibleTasks,
      count: eligibleTasks.length,
      message: `Found ${eligibleTasks.length} tasks eligible for email reminders`
    });

  } catch (error) {
    console.error('Error fetching tasks for email reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
