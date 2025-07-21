import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { startEmailService, stopEmailService, checkAndSendTaskEmails } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    switch (action) {
      case 'start':
        startEmailService();
        return NextResponse.json({ 
          success: true, 
          message: 'Email service started' 
        });

      case 'stop':
        stopEmailService();
        return NextResponse.json({ 
          success: true, 
          message: 'Email service stopped' 
        });

      case 'check':
        checkAndSendTaskEmails();
        return NextResponse.json({ 
          success: true, 
          message: 'Manual email check triggered' 
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: start, stop, or check' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Email service API error:', error);
    return NextResponse.json({ 
      error: 'Failed to manage email service',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Email service API is running',
    endpoints: {
      'POST /api/notifications/email-service': 'Manage email service (actions: start, stop, check)',
      'POST /api/notifications/email': 'Send emails for all eligible tasks',
      'GET /api/notifications/email': 'Get tasks eligible for email reminders'
    }
  });
}
