'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProject(form: FormData) {
  /* auth --------------------------------------------------------- */
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  /* read form ---------------------------------------------------- */
  const orgId = form.get('orgId')?.toString() || '';
  const name  = form.get('name')?.toString().trim() || '';
  const description = form.get('description')?.toString() || '';

  if (!name) return { error: 'Project name is required' } as const;

  /* membership guard (join table) -------------------------------- */
  const member = await prisma.userOrganization.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { userId: true },
  });
  if (!member) return { error: 'Forbidden' } as const;

  /* create project ---------------------------------------------- */
  await prisma.project.create({
    data: {
      name,
      description,
      organizationId: orgId,        // just set FK
      users: { connect: { id: userId } }, // optional: add creator to project
    },
  });

  /* refresh list + go back -------------------------------------- */
  revalidatePath('/dashboard');     // or `/dashboard/team`
  return redirect('/dashboard');
}
