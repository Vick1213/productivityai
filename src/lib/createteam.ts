'use server';

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { v4 as uuid } from 'uuid';
import { revalidatePath } from 'next/cache';

export async function createTeam(form: FormData) {
  /* 0️⃣ auth ------------------------------------------------------- */
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  /* 1️⃣ read & validate form -------------------------------------- */
  const name = form.get('name')?.toString().trim();
  if (!name) return { error: 'Organisation name is required' } as const;

  const emails = (form.get('invites')?.toString() ?? '')
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  /* 2️⃣ create org + link creator + invite rows ------------------- */
  const { org, invites } = await prisma.$transaction(async (tx) => {
    /* 2a. organisation */
    const org = await tx.organization.create({
      data: { name },
    });

    /* 2b. join table row: current user becomes OWNER */
    await tx.userOrganization.create({
      data: { userId, orgId: org.id, role: 'OWNER' },
    });

    /* 2c. pending invites */
    const invites = await Promise.all(
      emails.map(async (email) => {
        const token = uuid();
        await tx.invite.create({
          data: { email, token, organizationId: org.id },
        });
        return { email, token };
      })
    );

    return { org, invites };
  });

  /* 3️⃣ send e-mails (best-effort) -------------------------------- */
  if (invites.length && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await Promise.all(
      invites.map(({ email, token }) =>
        resend.emails.send({
          from: 'Team Invites <no-reply@productivityai.pro>',
          to: email,
          subject: `You’re invited to join ${org.name}`,
          html: `
            <p>Hello!</p>
            <p>You’ve been invited to join <strong>${org.name}</strong> on Productivity AI.</p>
            <p><a href="${base}/invite?org=${org.id}&token=${token}">Accept invitation</a></p>
          `,
        })
      )
    );
  }

  /* 4️⃣ refresh & redirect ---------------------------------------- */
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
