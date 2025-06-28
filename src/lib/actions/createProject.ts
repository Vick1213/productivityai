// lib/actions/projects.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/** helper – yyyy-MM-dd + HH:mm ➜ Date | null */
function toDate(date?: string | null, time?: string | null): Date | null {
  if (!date && !time) return null;
  const d = date?.trim() || new Date().toISOString().split('T')[0];
  const t = time?.trim() || '00:00';
  return new Date(`${d}T${t}:00`);
}

export async function createProject(form: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthenticated' };

  /* required */
  const name = form.get('name')?.toString().trim();
  if (!name) return { error: 'Name required' };

  /* optional */
  const description = form.get('description')?.toString().trim() ?? '';
  const memberIds   = form.getAll('memberIds').map(String);
  const completed   = form.get('completed') === 'on';

  /* NEW fields */
  const dueAt = toDate(
    form.get('dueDate')?.toString(),
    form.get('dueTime')?.toString()
  );

  /* caller’s org */
  const org = await prisma.organization.findFirst({
    where: { users: { some: { id: userId } } },
    select: { id: true },
  });
  if (!org) return { error: 'Caller has no organisation' };

  /* create */
  const project = await prisma.project.create({
    data: {
      name,
      description,
      completed,
      dueAt,
      organization: { connect: { id: org.id } },
      users: {
        connect:
          memberIds.length > 0
            ? memberIds.map((id) => ({ id }))
            : [{ id: userId }],
      },
    },
  });

  revalidatePath('/dashboard/projects');         // or /dashboard/team
  return project;
}
