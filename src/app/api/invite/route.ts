/* app/api/invite/accept/route.ts
   POST /api/invite/accept   { token, orgId }
*/
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  /* 1️⃣  auth */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  /* 2️⃣  body */
  const { token, orgId } = (await req.json()) as {
    token: string;
    orgId: string;
  };

  /* 3️⃣  check invite validity */
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.organizationId !== orgId)
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });

  /* 4️⃣  join org (many-to-many) + consume invite */
  await prisma.$transaction(async (tx) => {
    /* 4a. join table row (skipDuplicates keeps it idempotent) */
    await tx.userOrganization.createMany({
      data: [{ userId, orgId, role: "MEMBER" }],
      skipDuplicates: true,
    });

    /* 4b. update user to be client if invited as client */
    if (invite.isClient) {
      await tx.user.update({
        where: { id: userId },
        data: { isClient: true },
      });
    }

    /* 4c. consume invite */
    await tx.invite.delete({ where: { id: invite.id } });

    /* 4d. set primaryOrgId only if it is still null */
    await tx.user.updateMany({
      where: { id: userId, primaryOrgId: null },
      data: { primaryOrgId: orgId },
    });
  });

  return NextResponse.json({ ok: true });
}
