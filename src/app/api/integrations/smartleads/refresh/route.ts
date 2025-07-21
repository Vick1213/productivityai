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
  const stats = await sl.fetchCampaignAnalytics(project.smartleadCampaignId);

  /* Map the SmartLead stats to Goal names and values */
  const toUpdate = [
    { name: 'Emails Sent', value: stats.sent },
    { name: 'Opens Count', value: stats.opens },
    { name: 'Replies Count', value: stats.replies },
    { name: 'Positive Replies', value: stats.positives },
    { name: 'Open Rate', value: stats.openRate },
    { name: 'Reply Rate', value: stats.replyRate },
    { name: 'Positive Rate', value: stats.positivePct },
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
