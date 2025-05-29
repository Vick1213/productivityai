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
