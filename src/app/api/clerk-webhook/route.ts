/* app/api/clerk/webhook/route.ts */
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 * 0️⃣  POST /api/clerk/webhook  – handles user.created
 * ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  /* secret + raw payload ------------------------------------------------ */
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET)
    return new NextResponse("Missing Clerk webhook secret", { status: 500 });

  const hdrs           = headers();
  const svixId         = (await hdrs).get("svix-id")        ?? "";
  const svixTimestamp  = (await hdrs).get("svix-timestamp") ?? "";
  const svixSignature  = (await hdrs).get("svix-signature") ?? "";
  const rawBody        = await req.text();

  /* 1️⃣  Verify signature ----------------------------------------------- */
  let evt: any;
  try {
    evt = new Webhook(WEBHOOK_SECRET).verify(rawBody, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("❌  Clerk webhook signature mismatch", err);
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (evt.type !== "user.created") return NextResponse.json({ ok: true });

  /* 2️⃣  Extract Clerk user fields -------------------------------------- */
  const {
    id: clerkId,
    email_addresses,
    first_name,
    last_name,
    profile_image_url,
  } = evt.data;

  const email     = email_addresses?.[0]?.email_address?.toLowerCase() ?? "";
  const avatarUrl = profile_image_url ?? null;

  if (!email) return NextResponse.json({ ok: true });

  /* 3️⃣  Upsert + attach to invited orgs (many-to-many) ----------------- */
  try {
    await prisma.$transaction(async (tx) => {
      /* 3a. upsert User */
      await tx.user.upsert({
        where:  { id: clerkId },
        update: {
          email,
          firstName: first_name,
          lastName:  last_name,
          avatarUrl,
        },
        create: {
          id:        clerkId,
          email,
          firstName: first_name,
          lastName:  last_name,
          avatarUrl,
        },
      });

      /* 3b. pending invites for this e-mail */
      const invites = await tx.invite.findMany({
        where:  { email },
        select: { organizationId: true },
      });

      if (invites.length) {
        /* join rows in UserOrganization (role → MEMBER) */
        await tx.userOrganization.createMany({
          data: invites.map((inv) => ({
            userId: clerkId,
            orgId:  inv.organizationId,
            role:   "MEMBER",
          })),
          skipDuplicates: true,
        });

        /* optional: set first org as primaryOrgId */
        await tx.user.update({
          where: { id: clerkId },
          data:  { primaryOrgId: invites[0].organizationId },
        });

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
