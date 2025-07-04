// app/api/orgs/[orgId]/integrations/smartleads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { SmartleadClient } from '@/lib/smartlead';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orgId: string }> },
) {
  /* ❶  Await params (new Next.js requirement) */
  const { orgId } = await context.params;

  /* ❷  Auth – must be signed in */
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  /* ❸  Parse body */
  const { apiKey, clientId, selectedCampaigns } = await req.json();
  if (!apiKey || !clientId || !Array.isArray(selectedCampaigns))
    return NextResponse.json(
      { error: 'apiKey, clientId & selectedCampaigns are required' },
      { status: 400 },
    );

  /* ❹  Check caller is OWNER of the org */
  const membership = await prisma.userOrganization.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership || membership.role !== 'OWNER')
    return NextResponse.json(
      { error: 'Only organisation owners can do this' },
      { status: 403 },
    );

  /* ❺  Upsert IntegrationAccount */
  const integrationAccount = await prisma.integrationAccount.upsert({
    where: {
      provider_externalId: { provider: 'SMARTLEADS', externalId: clientId },
    },
    update: { apiKey },
    create: {
      provider: 'SMARTLEADS',
      externalId: clientId,
      apiKey,
      organizationId: orgId,
    },
  });

  /* ❻  Sync selected campaigns → projects */
// ...existing code...

  /* ❻  Sync selected campaigns → projects */
  const sl = new SmartleadClient(apiKey);
  const allCampaigns = await sl.listCampaigns(clientId);
  const nameMap = Object.fromEntries(allCampaigns.map((c) => [c.id, c.name]));

  // Get all users from this organization to connect them to projects
  const orgUsers = await prisma.userOrganization.findMany({
    where: { orgId },
    include: { user: true },
  });
  
  const userIds = orgUsers.map(membership => membership.userId);

  for (const cid of selectedCampaigns as string[]) {
    await prisma.project.upsert({
      where: { smartleadCampaignId: cid },
      update: {
        name: nameMap[cid] ?? `Smartlead Campaign ${cid}`,
        integrationAccountId: integrationAccount.id,
        // Connect all organization users to this project
        users: {
          connect: userIds.map(id => ({ id }))
        }
      },
      create: {
        name: nameMap[cid] ?? `Smartlead Campaign ${cid}`,
        organizationId: orgId,
        smartleadCampaignId: cid,
        integrationAccountId: integrationAccount.id,
        // Connect all organization users to this project
        users: {
          connect: userIds.map(id => ({ id }))
        }
      },
    });
  }

  return NextResponse.json({ ok: true });
}