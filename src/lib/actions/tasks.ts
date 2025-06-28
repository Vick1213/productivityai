'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Priority } from '@prisma/client';

function toDate(date?: string | null, time?: string | null): Date {
  const d = date?.trim() || new Date().toISOString().split('T')[0];
  const t = time?.trim() || '00:00';
  return new Date(`${d}T${t}:00`);
}

export async function addTask(form: FormData) {
  const { userId: currentUser } = await auth();
  if (!currentUser) throw new Error('Unauthenticated');

  const name = (form.get('name') as string)?.trim();
  if (!name) return;

  /* ----- optional fields from the drawer ----- */
  const projectId  = form.get('projectId')?.toString() || null;
  const assigneeId = form.get('userId')?.toString() || currentUser;

  const description = (form.get('description') as string) ?? '';
  const priority    =
    (form.get('priority')?.toString().toUpperCase() as Priority) ??
    Priority.LOW;

  // fallback to "now" if drawer didn’t send date/time
  const startsAt = toDate(
    form.get('date')?.toString(),
    form.get('time')?.toString()
  );

  // if no due date chosen, use the same timestamp
  const dueAt = toDate(
    form.get('dueDate')?.toString(),
    form.get('dueTime')?.toString()
  ) || startsAt;

  await prisma.task.create({
    data: {
      name,
      description,
      priority,
      startsAt,
      dueAt,          // ✅ always defined
      projectId,
      userId: assigneeId,
    },
  });

  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
  else revalidatePath('/dashboard');
}


/* toggleTask & deleteTask stay unchanged */

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
