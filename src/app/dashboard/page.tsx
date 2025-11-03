// page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SimplifiedTaskPanel } from '@/components/dashboard/simplified-task-panel';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Get current user with their organizations
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orgMemberships: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      primaryOrg: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  if (!currentUser) redirect('/sign-in');

  // Get all tasks from user's organizations (both assigned to them and others)
  const organizationIds = currentUser.orgMemberships.map(m => m.organization.id);
  
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { userId }, // Tasks assigned to current user
        {
          project: {
            organizationId: { in: organizationIds }
          }
        }
      ]
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        }
      }
    },
    orderBy: { dueAt: 'asc' },
  });

  // Get projects from user's organizations
  const projects = await prisma.project.findMany({
    where: {
      organizationId: { in: organizationIds }
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  // Get all team members from user's organizations
  const teamMembers = await prisma.user.findMany({
    where: {
      orgMemberships: {
        some: {
          orgId: { in: organizationIds }
        }
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    }
  });

  // Map organizations for the component
  const organizations = currentUser.orgMemberships.map(m => m.organization);

  // Map tasks with proper types
  const mappedTasks = tasks.map(task => ({
    ...task,
    project: task.project === null ? undefined : task.project,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <SimplifiedTaskPanel 
        tasks={mappedTasks} 
        projects={projects} 
        organizations={organizations}
        teamMembers={teamMembers}
        currentUserId={userId}
      />
    </div>
  );
}