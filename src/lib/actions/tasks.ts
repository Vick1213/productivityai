'use server'
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import  prisma  from '@/lib/prisma';

export async function addTask(data: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const title = data.get('title')?.toString().trim();
  const due   = data.get('due')?.toString();
  if (!title) return;
  await prisma.task.create({
    data: { name:title, userId, dueDate: due ? new Date(due) : null },
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