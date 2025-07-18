import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SmartleadClient } from '@/lib/smartlead';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; leadEmail: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, leadEmail } = await params;

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        users: {
          some: {
            id: userId
          }
        }
      },
      include: {
        integrationAccount: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.smartleadCampaignId || !project.integrationAccount?.apiKey) {
      return NextResponse.json({ error: 'SmartLead integration not configured' }, { status: 400 });
    }

    // Fetch lead details from SmartLead using the direct leads API
    const smartlead = new SmartleadClient(project.integrationAccount.apiKey);
    const leadDetails = await smartlead.fetchLeadByEmail(decodeURIComponent(leadEmail));

    return NextResponse.json({
      lead: leadDetails
    });
  } catch (error) {
    console.error('Error fetching lead details:', error);
    
    // Check if it's a "lead not found" error
    if (error instanceof Error && error.message.includes('Lead not found for email:')) {
      const { leadEmail } = await params;
      return NextResponse.json(
        { error: 'Lead not found', message: `No lead found with email: ${decodeURIComponent(leadEmail)}` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch lead details' },
      { status: 500 }
    );
  }
}
