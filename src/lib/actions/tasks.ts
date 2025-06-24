'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Priority } from '@prisma/client';

//--------------------------------------------------------------------------
// Helpers
//--------------------------------------------------------------------------

/**
 * Combines separate yyyy-MM-dd and HH:mm strings into a Date object.
 * Falls back to today @ 00:00 when either part is missing.
 */
function toDateTime(date?: string | null, time?: string | null): Date {
  const d = date?.trim() || new Date().toISOString().split('T')[0]; // today
  const t = time?.trim() || '00:00';
  // Construct an ISO 8601 string in local time, let JS cast to Date.
  return new Date(`${d}T${t}:00`);
}

function parsePriority(value: FormDataEntryValue | null): Priority {
  if (!value) return Priority.LOW;
  const key = value.toString().toUpperCase();
  return key in Priority ? (Priority as any)[key] : Priority.LOW;
}

//--------------------------------------------------------------------------
//  Server actions
//--------------------------------------------------------------------------

export async function addTask(form: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const name = form.get('title')?.toString().trim();
  if (!name) return; // silently ignore empty submissions

  const dateStr   = form.get('date')?.toString(); // yyyy-MM-dd
  const timeStr   = form.get('time')?.toString(); // HH:mm
  const startsAt  = toDateTime(dateStr, timeStr);
  const dueAtStr     = form.get('dueAt')?.toString();
  const dueAttimeStr = form.get('dueTime')?.toString();

  const dueAt =toDateTime(dueAtStr, dueAttimeStr); // optional, so null if empty

  const description     = form.get('description')?.toString() ?? '';
  const aiInstructions  = form.get('ai')?.toString() ?? '';
  const priority        = parsePriority(form.get('priority'));

  await prisma.task.create({
    data: {
      name,
      userId,
      description,
      aiInstructions,
      priority,
      startsAt,
      dueAt,
      // completed / createdAt / updatedAt via schema defaults
    },
  });

  revalidatePath('/dashboard');
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
