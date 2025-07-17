import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const { replyId, meetingDate, meetingTime, meetingLink, notes } = body;

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        users: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify the reply exists and belongs to this project
    const reply = await prisma.campaignReply.findFirst({
      where: {
        id: replyId,
        projectId: projectId
      }
    });

    if (!reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    // Create the booked meeting
    const meeting = await prisma.bookedMeeting.create({
      data: {
        projectId,
        replyId,
        meetingDate: meetingDate ? new Date(meetingDate) : null,
        meetingTime,
        meetingLink,
        notes
      },
      include: {
        reply: true
      }
    });

    // Update the reply status to BOOKED_MEETING
    await prisma.campaignReply.update({
      where: { id: replyId },
      data: { status: 'BOOKED_MEETING' }
    });

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error creating booked meeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        users: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const meetings = await prisma.bookedMeeting.findMany({
      where: {
        projectId: projectId
      },
      include: {
        reply: true
      },
      orderBy: {
        meetingDate: 'asc'
      }
    });

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Error fetching booked meetings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
