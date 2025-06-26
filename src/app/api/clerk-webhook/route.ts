import { headers } from 'next/headers';
import { Webhook } from 'svix';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  /* ————————————————————————————
   * 0️⃣  Secret & raw payload
   * ———————————————————————————— */
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET)
    return new NextResponse('Missing Clerk webhook secret', { status: 500 });

  const hdrs           = headers();
  const svixId         = (await hdrs).get('svix-id')        ?? '';
  const svixTimestamp  = (await hdrs).get('svix-timestamp') ?? '';
  const svixSignature  = (await hdrs).get('svix-signature') ?? '';
  const payload        = await req.text();

  /* ————————————————————————————
   * 1️⃣  Verify signature
   * ———————————————————————————— */
  let evt: any;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(payload, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.error('❌  Clerk webhook signature mismatch', err);
    return new NextResponse('Bad signature', { status: 400 });
  }

  if (evt.type !== 'user.created')
    return new NextResponse('Event ignored', { status: 200 });

  /* ————————————————————————————
   * 2️⃣  Extract user data
   * ———————————————————————————— */
  const {
    id: clerkId,
    email_addresses,
    first_name,
    last_name,
  } = evt.data;

  const email = email_addresses?.[0]?.email_address?.toLowerCase() ?? '';
  if (!email) return new NextResponse('No e-mail on user', { status: 200 });

  /* ————————————————————————————
   * 3️⃣  Upsert user + attach to orgs
   * ———————————————————————————— */
  try {
    await prisma.$transaction(async tx => {
      // 3a. user row (create or update)
      await tx.user.upsert({
        where:  { id: clerkId },
        update: { email, firstName: first_name, lastName: last_name },
        create: { id: clerkId, email, firstName: first_name, lastName: last_name },
      });

      // 3b. any orgs that invited this e-mail
      const invites = await tx.invite.findMany({
        where: { email },
        select: { id: true, organizationId: true },
      });

      if (invites.length) {
        // connect the user to each organisation
        await Promise.all(
          invites.map((inv: { id: string, organizationId: string }) =>
            tx.organization.update({
              where: { id: inv.organizationId },
              data:  { users: { connect: { id: clerkId } } },
            }),
          ),
        );

        // optional: delete consumed invites
        await tx.invite.deleteMany({ where: { email } });
      }
    });
  } catch (err) {
    console.error('❌  Prisma error in Clerk webhook:', err);
    return new NextResponse('Database error', { status: 500 });
  }

  return new NextResponse('OK', { status: 200 });
}
