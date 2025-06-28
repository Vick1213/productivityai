/* app/api/clerk/webhook/route.ts */
import { headers } from "next/headers";
import { Webhook } from "svix";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 * 0️⃣  Shared secret & raw payload
 * ------------------------------------------------------------------ */
export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET)
    return new NextResponse("Missing Clerk webhook secret", { status: 500 });

  const hdrs          = headers();
  const svixId        = (await hdrs).get("svix-id")        ?? "";
  const svixTimestamp = (await hdrs).get("svix-timestamp") ?? "";
  const svixSignature = (await hdrs).get("svix-signature") ?? "";
  const payload       = await req.text();

  /* ---------------------------------------------------------------- *
   * 1️⃣  Verify signature
   * ---------------------------------------------------------------- */
  let evt: any;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(payload, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("❌  Clerk webhook signature mismatch", err);
    return new NextResponse("Bad signature", { status: 400 });
  }

  /* only handle user.created */
  if (evt.type !== "user.created") return NextResponse.json({ ok: true });

  /* ---------------------------------------------------------------- *
   * 2️⃣  Extract user info
   * ---------------------------------------------------------------- */
  const {
    id: clerkId,
    email_addresses,
    first_name,
    last_name,
    profile_image_url,          // ✔ avatar URL from Clerk docs
  } = evt.data;

  const email      = email_addresses?.[0]?.email_address?.toLowerCase() ?? "";
  const avatarUrl  = profile_image_url ?? null;

  if (!email) return NextResponse.json({ ok: true });

  /* ---------------------------------------------------------------- *
   * 3️⃣  Upsert user + connect to invited org(s)
   * ---------------------------------------------------------------- */
  try {
    await prisma.$transaction(async (tx) => {
      /* 3a. User row */
      await tx.user.upsert({
        where:  { id: clerkId },
        update: {
          email,
          firstName: first_name,
          lastName:  last_name,
          avatarUrl,                 // ← store avatar
        },
        create: {
          id:        clerkId,
          email,
          firstName: first_name,
          lastName:  last_name,
          avatarUrl,                 // ← store avatar
        },
      });

      /* 3b. Pending invites for this e-mail */
      const invites = await tx.invite.findMany({
        where:  { email },
        select: { id: true, organizationId: true },
      });

      if (invites.length) {
        /* connect user to each organisation */
        await Promise.all(
          invites.map((inv) =>
            tx.organization.update({
              where: { id: inv.organizationId },
              data:  { users: { connect: { id: clerkId } } },
            })
          )
        );
        /* consume invites */
        await tx.invite.deleteMany({ where: { email } });
      }
    });
  } catch (err) {
    console.error("❌  Prisma error in Clerk webhook:", err);
    return new NextResponse("Database error", { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
