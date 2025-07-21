import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { generateTaskReminderHTML } from '@/lib/email';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return new NextResponse(
        'Missing taskId parameter. Usage: /api/notifications/email/preview?taskId=TASK_ID',
        { status: 400, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // Get task with all relations
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: userId
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

    if (!task) {
      return new NextResponse(
        'Task not found or you do not have access to it.',
        { status: 404, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // Generate HTML email
    const emailHtml = generateTaskReminderHTML(task);

    return new NextResponse(emailHtml, {
      headers: {
        'Content-Type': 'text/html'
      }
    });

  } catch (error) {
    console.error('Error generating email preview:', error);
    return new NextResponse(
      'Error generating email preview: ' + (error instanceof Error ? error.message : 'Unknown error'),
      { status: 500, headers: { 'Content-Type': 'text/plain' } }
    );
  }
}
