import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { SmartleadClient } from '@/lib/smartlead';

async function getPositiveAndRepliedLeads(apiKey: string, campaignId: string) {
  try {
    const smartlead = new SmartleadClient(apiKey);
    const allRepliedLeads = await smartlead.fetchCampaignReplies(campaignId);
    
    // Categorize leads based on their lead_category
    const positiveCategories = ["Interested", "Meeting Request", "Information Request"];
    interface CampaignReply {
      leadName: string;
      leadEmail: string;
      leadCategory: string;
      emailSubject: string;
      emailMessage: string;
    }

    const positiveLeads: CampaignReply[] = allRepliedLeads.filter(
      (reply: CampaignReply) => positiveCategories.includes(reply.leadCategory)
    );

    return {
      positiveLeads,
      allRepliedLeads
    };
  } catch (error) {
    console.error('Error fetching SmartLead data:', error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const syncFromSmartlead = searchParams.get('sync') === 'true';

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

    // If sync is requested and project has SmartLead integration
    if (syncFromSmartlead && project.smartleadCampaignId && project.integrationAccount?.apiKey) {
      try {
        const smartleadData = await getPositiveAndRepliedLeads(
          project.integrationAccount.apiKey,
          project.smartleadCampaignId
        );

        // Sync to database
        for (const reply of smartleadData.allRepliedLeads) {
          const isPositive = smartleadData.positiveLeads.some((p: any) => p.leadEmail === reply.leadEmail);
          
          // Check if record exists
          const existingReply = await prisma.campaignReply.findFirst({
            where: {
              projectId: projectId,
              leadEmail: reply.leadEmail
            }
          });

          if (existingReply) {
            // Update existing record
            await prisma.campaignReply.update({
              where: {
                id: existingReply.id
              },
              data: {
                leadName: reply.leadName,
                status: isPositive ? 'POSITIVE' : 'REPLIED',
                replyContent: `${reply.emailSubject}\n\n${reply.emailMessage}`,
                updatedAt: new Date()
              }
            });
          } else {
            // Create new record
            await prisma.campaignReply.create({
              data: {
                projectId: projectId,
                leadName: reply.leadName,
                leadEmail: reply.leadEmail,
                status: isPositive ? 'POSITIVE' : 'REPLIED',
                replyContent: `${reply.emailSubject}\n\n${reply.emailMessage}`
              }
            });
          }
        }
      } catch (error) {
        console.error('Error syncing SmartLead data:', error);
        return NextResponse.json(
          { error: 'Failed to sync SmartLead data' },
          { status: 500 }
        );
      }
    }

    // Get replies from database
    const replies = await prisma.campaignReply.findMany({
      where: {
        projectId: projectId
      },
      include: {
        bookedMeeting: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const repliesCount = {
      total: replies.length,
      positive: replies.filter(r => r.status === 'POSITIVE').length,
      replied: replies.filter(r => r.status === 'REPLIED').length,
      bookedMeetings: replies.filter(r => r.status === 'BOOKED_MEETING').length
    };

    return NextResponse.json({ 
      replies, 
      count: repliesCount,
      lastSynced: syncFromSmartlead ? new Date().toISOString() : null
    });
  } catch (error) {
    console.error('Error fetching campaign replies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const { leadName, leadEmail, status, replyContent } = body;

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        users: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create or update the reply
    const existingReply = await prisma.campaignReply.findFirst({
      where: {
        projectId: projectId,
        leadEmail: leadEmail
      }
    });

    let reply;
    if (existingReply) {
      // Update existing record
      reply = await prisma.campaignReply.update({
        where: {
          id: existingReply.id
        },
        data: {
          leadName,
          status,
          replyContent,
          updatedAt: new Date()
        },
        include: {
          bookedMeeting: true
        }
      });
    } else {
      // Create new record
      reply = await prisma.campaignReply.create({
        data: {
          projectId,
          leadName,
          leadEmail,
          status,
          replyContent
        },
        include: {
          bookedMeeting: true
        }
      });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error creating campaign reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
