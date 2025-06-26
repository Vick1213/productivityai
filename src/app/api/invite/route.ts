import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { token, orgId } = await req.json();

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.organizationId !== orgId)
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });

  // connect the now-authenticated user
  await prisma.organization.update({
    where: { id: orgId },
    data:  { users: { connect: { id: userId } } },
  });

  // optional cleanup
  await prisma.invite.delete({ where: { id: invite.id } });

  return NextResponse.json({ ok: true });
}
