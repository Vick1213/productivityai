'use server';

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { v4 as uuid } from 'uuid';
import { revalidatePath } from 'next/cache';
import { NextApiHandler } from 'next';

export async function createTeam(form: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const name = form.get('name')?.toString().trim();
  if (!name) return { error: 'Organisation name is required' } as const;

  const invitesRaw = form.get('invites')?.toString() ?? '';
  const emails = invitesRaw
    .split(/[\\s,]+/)
    .map((e) => e.trim())
    .filter(Boolean);

  // 1️⃣ Create organisation and attach current user
  const org = await prisma.organization.create({
    data: {
      name,
      users: { connect: { id: userId } },
    },
  });

  // 2️⃣ Send invite links via Resend (best-effort)
  if (emails.length && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const base   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    await Promise.all(
      emails.map(async (to) => {
        const token = uuid();
        const link  = `${base}/api/invite?org=${org.id}&token=${token}`;

        // Optional: persist token ↔ email for verification later
        // await prisma.invite.create({ data: { id: token, email: to, organizationId: org.id } });

        await resend.emails.send({
          from: 'Team Invites <no-reply@yourapp.com>',
          to,
          subject: `You’re invited to join ${org.name}`,
          html: `<p>Hello!</p>
                 <p>You’ve been invited to join <strong>${org.name}</strong> on Productivity AI.</p>
                 <p><a href="${link}">Accept invitation</a></p>`,
        });
      }),
    );
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
