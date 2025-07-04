import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SmartleadClient } from '@/lib/smartlead';

export async function POST(req: NextRequest) {
  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { integrationAccount: true },
  });
  if (!project?.integrationAccount?.apiKey || !project.smartleadCampaignId)
    return NextResponse.json({ error: 'Not a SmartLeads project' }, { status: 400 });

  const sl = new SmartleadClient(project.integrationAccount.apiKey);
  const stats = await sl.fetchCampaignAnalytics(project.smartleadCampaignId); // you’ll add this

  /* sample mapping – adjust to your Goal names */
  const toUpdate = [
    { name: 'Emails Sent', value: stats.sent },
    { name: 'replies %', value: stats.replies },
    { name: 'Positive Replies', value: stats.positives },
    { name: 'Total', value: stats.openRate },
  ];

  for (const g of toUpdate) {
    await prisma.goal.upsert({
      where: { projectId_name: { projectId, name: g.name } },
      update: { currentProgress: g.value, updatedAt: new Date() },
      create: { projectId, name: g.name, totalTarget: 100, currentProgress: g.value },
    });
  }

  return NextResponse.json({ ok: true });
}
