'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  error?: string;
}

export async function createProject(form: FormData): Promise<ActionResult | void> {
  const { userId } =  await auth();
  if (!userId) return { error: 'Unauthenticated' };

  const name = form.get('name')?.toString().trim();
  if (!name) return { error: 'Project name required' };

  const description = form.get('description')?.toString().trim() ?? '';

  // taskIds[] comes from multiple checkboxes
  const taskIds = form.getAll('taskIds').map(String);

  const newTaskName = form.get('newTaskName')?.toString().trim();
  const newTaskDescription = form.get('newTaskDescription')?.toString().trim();

  // 1️⃣ create project and link user as a member
  const project = await prisma.project.create({
    data: {
      name,
      description,
      users: {
        connect: { id: userId },
      },
    },
  });

  // 2️⃣ attach existing tasks
  if (taskIds.length) {
    await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      data: { projectId: project.id },
    });
  }

  // 3️⃣ optionally create first task
  if (newTaskName) {
    await prisma.task.create({
      data: {
        name: newTaskName,
        description: newTaskDescription ?? '',
        userId,
        projectId: project.id,
        startsAt: new Date(),
        dueAt: new Date(),
      },
    });
  }

  revalidatePath('/dashboard');
}
export async function deleteProject(projectId: string) {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthenticated' };

  // Ensure the project belongs to the user
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      users: { some: { id: userId } },
    },
  });

  if (!project) return { error: 'Project not found or access denied' };

  // Delete the project and all associated tasks and goals
  await prisma.project.delete({
    where: { id: projectId }
  });

  revalidatePath('/dashboard');
}

export async function updateProjectDetails(
  projectId: string, 
  data: { name?: string; description?: string; dueAt?: Date | null }
) {
  await prisma.project.update({
    where: { id: projectId },
    data
  });
  
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addGoal(
  projectId: string,
  data: { name: string; description?: string; totalTarget: number }
) {
  await prisma.goal.create({
    data: {
      ...data,
      projectId,
      currentProgress: 0
    }
  });
  
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateGoal(
  goalId: string,
  projectId: string,
  data: { name?: string; description?: string; totalTarget?: number; currentProgress?: number }
) {
  await prisma.goal.update({
    where: { id: goalId },
    data
  });
  
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deleteGoal(goalId: string, projectId: string) {
  await prisma.goal.delete({
    where: { id: goalId }
  });
  
  revalidatePath(`/dashboard/projects/${projectId}`);
}