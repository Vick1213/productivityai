'use server'
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import  prisma  from '@/lib/prisma';

export async function addTask(form: FormData) {
  const { userId } =  await auth();
  if (!userId) throw new Error('Unauthenticated');

  const name = form.get('title')?.toString().trim();
  if (!name) return;

  // ─── Optional fields pulled from the form ──────────────────
  const time         = form.get('time')?.toString()            ?? '00:00';
  const dateStr      = form.get('date')?.toString();           // yyyy-MM-dd
  const description  = form.get('description')?.toString()     ?? '';
  const aiInstructions = form.get('ai')?.toString()            ?? '';

  // Use today if no date supplied
  const dateObj = dateStr ? new Date(dateStr) : new Date();

  await prisma.task.create({
    data: {
      name,
      userId,
      time,
      date:       dateObj,
      dueDate:    dateObj,          // storing the same value in both
      description,
      aiInstructions,
      // completed / createdAt / updatedAt handled by schema defaults
    },
  });
  revalidatePath('/dashboard');
}

export async function toggleTask(id: string, completed: boolean) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');
  await prisma.task.update({ where: { id }, data: { completed } });
  revalidatePath('/dashboard');
}

export async function deleteTask(id: string) {
  'use server';
  const { userId } =  await auth();
  if (!userId) throw new Error('Unauthenticated');
  await prisma.task.delete({ where: { id } });
  revalidatePath('/dashboard');
}