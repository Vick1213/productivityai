import { Webhook } from "svix";
//import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
    if (!WEBHOOK_SECRET) {
      return new NextResponse('Missing Clerk webhook secret', { status: 500 });
    }
  
    const headerPayload = headers(); // no need for `await`
    const svixId = (await headerPayload).get('svix-id')!;
    const svixTimestamp = (await headerPayload).get('svix-timestamp')!;
    const svixSignature = (await headerPayload).get('svix-signature')!;
  
    const payload = await req.text();
    const webhook = new Webhook(WEBHOOK_SECRET);
  
    let event: any;
    try {
      event = webhook.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return new NextResponse('Unauthorized', { status: 400 });
    }
  
    const eventType = event.type;
    const userData = event.data;
  
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = userData;
      const email = email_addresses?.[0]?.email_address ?? '';
  
      try {
        await prisma.user.create({
          data: {
            id: id,
            email:email,
            firstName: first_name,
            lastName: last_name,
          },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          console.log(`User with Clerk ID ${id} already exists.`);
        } else {
          console.error('Prisma error:', e);
          return new NextResponse('Database error', { status: 500 });
        }
      }
  
      return new NextResponse('User created', { status: 200 });
    }
  
    return new NextResponse('Event ignored', { status: 200 });
  }