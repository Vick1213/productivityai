import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// Add Edge runtime for better performance
export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50); // Max 50 projects
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const includeCompleted = url.searchParams.get('includeCompleted') === 'true';

    // Optimized query with pagination and selective fields
    const projects = await prisma.project.findMany({
      where: {
        users: {
          some: {
            id: userId
          }
        },
        ...(includeCompleted ? {} : { completed: false })
      },
      select: {
        id: true,
        name: true,
        description: true,
        completed: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,
        smartleadCampaignId: true,
        tasks: {
          select: {
            id: true,
            name: true,
            completed: true,
            priority: true,
            dueAt: true,
          },
          take: 10, // Limit tasks per project
          orderBy: { dueAt: 'asc' }
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
          },
          take: 5 // Limit goals per project
        },
        organization: {
          select: {
            id: true,
            name: true,
          }
        },        integrationAccount: {
          select: {
            externalId: true,
            provider: true
          }
        }
      },
      take: limit,
      skip: offset,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Add cache headers for better performance
    const response = NextResponse.json({
      projects,
      pagination: {
        limit,
        offset,
        hasMore: projects.length === limit
      }
    });
    
    // Cache for 30 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return response;

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}