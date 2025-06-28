// lib/actions/projects.ts
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';   // ✅ cross-env import (not /server)

// …rest of createProject exactly as before …

export async function createProject(form: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthenticated" };

  // 🔍  FIND the org exactly like /api/team does
  const org = await prisma.organization.findFirst({
    where: { users: { some: { id: userId } } },
    select: { id: true },
  });
  if (!org) return { error: "Caller not in any organisation" };

  /* form fields */
  const name        = form.get("name") as string;
  const description = form.get("description") as string | null;
  const memberIds   = form.getAll("memberIds") as string[];

  // 📝 create + connect org AND users
  const project = await prisma.project.create({
    data: {
      name,
      description,
      organization: { connect: { id: org.id } },   // ✅  now set
      users: {
        connect: memberIds.length
          ? memberIds.map((id) => ({ id }))
          : [{ id: userId }],                      // ensure at least creator
      },
    },
  });

  return project;      // TeamPage will re-fetch afterwards
}
