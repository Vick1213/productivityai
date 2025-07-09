import { NextRequest, NextResponse } from 'next/server';
import { startNotificationService } from '@/lib/notificationService';

let serviceStarted = false;

export async function GET(req: NextRequest) {
  if (!serviceStarted) {
    startNotificationService();
    serviceStarted = true;
    return NextResponse.json({ message: 'Notification service started' });
  }
  
  return NextResponse.json({ message: 'Notification service already running' });
}

export async function POST(req: NextRequest) {
  // Manual trigger for testing
  const { checkTasks, checkProjects } = await req.json();
  
  if (checkTasks) {
    const { checkTaskNotifications } = await import('@/lib/notificationService');
    await checkTaskNotifications();
  }
  
  if (checkProjects) {
    const { checkProjectNotifications } = await import('@/lib/notificationService');
    await checkProjectNotifications();
  }
  
  return NextResponse.json({ message: 'Manual notification check completed' });
}
