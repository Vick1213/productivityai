'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Priority } from '@prisma/client';

export async function addTask(form: FormData) {
  const { userId: currentUser } = await auth();
  if (!currentUser) throw new Error('Unauthenticated');

  const name = (form.get('name') as string)?.trim();
  if (!name) return;

  // Optional fields from the simplified form
  const projectId = form.get('projectId')?.toString() || null;
  const assigneeId = form.get('userId')?.toString() || currentUser;

  const description = (form.get('description') as string) ?? '';
  const priority = (form.get('priority')?.toString().toUpperCase() as Priority) ?? Priority.MEDIUM;

  // Handle due date and time
  const dueDate = form.get('dueDate')?.toString();
  const dueTime = form.get('dueTime')?.toString();
  
  let dueAt: Date;
  if (dueDate) {
    const timeStr = dueTime || '23:59'; // Default to end of day if no time specified
    dueAt = new Date(`${dueDate}T${timeStr}:00`);
  } else {
    // Default to end of today if no due date specified
    const today = new Date();
    today.setHours(23, 59, 0, 0);
    dueAt = today;
  }

  // Default start time to now
  const startsAt = new Date();

  await prisma.task.create({
    data: {
      name,
      description,
      priority,
      startsAt,
      dueAt,
      projectId,
      userId: assigneeId,
    },
  });

  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
  else revalidatePath('/dashboard');
}

export async function toggleTask(id: string, completed: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  await prisma.task.update({ where: { id }, data: { completed } });
  revalidatePath('/dashboard');
}

export async function deleteTask(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  await prisma.task.delete({ where: { id } });
  revalidatePath('/dashboard');
}
