import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  /* 1️⃣  auth ---------------------------------------------------- */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  /* 2️⃣  body ---------------------------------------------------- */
  const { orgId, emails } = (await req.json()) as {
    orgId: string;
    emails: string[];
  };
  if (!orgId || !Array.isArray(emails) || emails.length === 0)
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });

  /* 3️⃣  membership guard (join table) -------------------------- */
  const member = await prisma.userOrganization.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { userId: true },
  });
  if (!member)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  /* 4️⃣  create invite rows ------------------------------------- */
  const invites = await prisma.$transaction(async (tx) =>
    Promise.all(
      emails.map(async (raw) => {
        const email = raw.toLowerCase().trim();
        const token = uuid();
        await tx.invite.create({
          data: { email, token, organizationId: orgId },
        });
        return { email, token };
      })
    )
  );

  /* 5️⃣  send e-mails (best-effort) ------------------------------ */
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await Promise.all(
      invites.map(({ email, token }) =>
        resend.emails.send({
          from: "Team Invites <no-reply@productivityai.pro>",
          to: email,
          subject: "You have been invited to a team",
          html: `
            <p>Hello!</p>
            <p>You’ve been invited to join a team on Productivity AI.</p>
            <p><a href="${base}/invite?org=${orgId}&token=${token}">
                 Accept invitation
               </a></p>
          `,
        })
      )
    );
  } else {
    console.warn("RESEND_API_KEY missing – invites logged but not e-mailed.");
  }

  return NextResponse.json({ ok: true });
}
