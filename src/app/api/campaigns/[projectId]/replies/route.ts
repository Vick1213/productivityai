import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

interface SmartLeadStatistic {
  lead_name: string;
  lead_email: string;
  lead_category: string;
  sequence_number: number;
  stats_id: string;
  email_campaign_seq_id: number;
  seq_variant_id?: number;
  email_subject: string;
  email_message: string;
}

async function getPositiveAndRepliedLeads(apiKey: string, campaignId: string) {
  const baseUrl = "https://server.smartlead.ai/api/v1";
  
  try {
    // Get all replied leads with their categories
    const repliedResponse = await fetch(
      `${baseUrl}/campaigns/${campaignId}/statistics?api_key=${apiKey}&email_status=replied&offset=0&limit=500`
    );
    const repliedData = await repliedResponse.json();
    
    const repliedStats = (repliedData.data || []) as SmartLeadStatistic[];
    
    // Categorize leads based on their lead_category
    const positiveCategories = ["Interested", "Meeting Request", "Information Request"];
    const positiveLeads = repliedStats.filter(stat => 
      positiveCategories.includes(stat.lead_category)
    );
    const allRepliedLeads = repliedStats;

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
        for (const stat of smartleadData.allRepliedLeads) {
          const isPositive = smartleadData.positiveLeads.some(p => p.lead_email === stat.lead_email);
          
          // Check if record exists
          const existingReply = await prisma.campaignReply.findFirst({
            where: {
              projectId: projectId,
              leadEmail: stat.lead_email
            }
          });

          if (existingReply) {
            // Update existing record
            await prisma.campaignReply.update({
              where: {
                id: existingReply.id
              },
              data: {
                leadName: stat.lead_name,
                status: isPositive ? 'POSITIVE' : 'REPLIED',
                replyContent: `${stat.email_subject}\n\n${stat.email_message}`,
                updatedAt: new Date()
              }
            });
          } else {
            // Create new record
            await prisma.campaignReply.create({
              data: {
                projectId: projectId,
                leadName: stat.lead_name,
                leadEmail: stat.lead_email,
                status: isPositive ? 'POSITIVE' : 'REPLIED',
                replyContent: `${stat.email_subject}\n\n${stat.email_message}`
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
