'use server';

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { v4 as uuid } from 'uuid';
import { revalidatePath } from 'next/cache';

export async function createTeam(form: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const name = form.get('name')?.toString().trim();
  if (!name) return { error: 'Organisation name is required' } as const;

  const emails = (form.get('invites')?.toString() ?? '')
    .split(/[,\s]+/)              // commas OR whitespace
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  /* -----------------------------------------------------------
   * 1️⃣  Create organisation + invite rows in one transaction
   * --------------------------------------------------------- */
  const { org, invites } = await prisma.$transaction(async tx => {
    // organisation with the current user attached
    const org = await tx.organization.create({
      data: {
        name,
        users: { connect: { id: userId } },
      },
    });

    // one Invite row per e-mail
    const invites = await Promise.all(
      emails.map(async email => {
        const token = uuid();
        await tx.invite.create({
          data: { email, token, organizationId: org.id },
        });
        return { email, token };
      }),
    );

    return { org, invites };
  });

  /* -----------------------------------------------------------
   * 2️⃣  Fire Resend e-mails (best-effort, outside the TX)
   * --------------------------------------------------------- */
  if (invites.length && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await Promise.all(
      invites.map(({ email, token }) =>
        resend.emails.send({
          from: 'Team Invites <no-reply@yourapp.com>',
          to: email,
          subject: `You’re invited to join ${org.name}`,
          html: `
            <p>Hello!</p>
            <p>You’ve been invited to join <strong>${org.name}</strong> on Productivity AI.</p>
            <p><a href="${base}/invite?org=${org.id}&token=${token}">Accept invitation</a></p>
          `,
        }),
      ),
    );
  }

  /* -----------------------------------------------------------
   * 3️⃣  Done – refresh and send the creator to their dashboard
   * --------------------------------------------------------- */
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
