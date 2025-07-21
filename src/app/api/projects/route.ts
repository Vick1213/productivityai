import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all projects where the user is a member
    const projects = await prisma.project.findMany({
      where: {
        users: {
          some: {
            id: userId
          }
        }
      },
      include: {
        tasks: {
          select: {
            id: true,
            name: true,
            completed: true,
            priority: true,
            dueAt: true,
          }
        },
        goals: {
          select: {
            id: true,
            name: true,
            description: true,
            currentProgress: true,
            totalTarget: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
          }
        },
        integrationAccount: {
          select: {
            externalId: true,
            provider: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json({
      projects,
      count: projects.length
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}