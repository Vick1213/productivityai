import prisma from '@/lib/prisma';
import { sendTaskReminderEmail, shouldSendTaskReminder } from '@/lib/email';

let emailServiceRunning = false;

export async function checkAndSendTaskEmails() {
  if (emailServiceRunning) {
    console.log('Email service already running, skipping...');
    return;
  }

  emailServiceRunning = true;
  console.log('Starting task email reminder check...');

  try {
    // Get all high priority tasks that are due soon or overdue
    const tasks = await prisma.task.findMany({
      where: {
        priority: 'HIGH',
        completed: false,
        dueAt: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Due within 24 hours or already overdue
        }
      },
      include: {
        user: true,
        project: {
          include: {
            organization: true
          }
        }
      }
    });

    console.log(`Found ${tasks.length} high priority tasks due within 24 hours`);

    let emailsSent = 0;
    
    for (const task of tasks) {
      if (shouldSendTaskReminder(task)) {
        console.log(`Sending email for task: ${task.name} (${task.id})`);
        const result = await sendTaskReminderEmail(task);
        
        if (result.success) {
          emailsSent++;
          console.log(`✅ Email sent successfully for task ${task.name}`);
        } else {
          console.log(`❌ Failed to send email for task ${task.name}: ${result.reason || result.error}`);
        }
        
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Email check completed. Sent ${emailsSent} emails out of ${tasks.length} tasks checked.`);
    
  } catch (error) {
    console.error('Error in email service:', error);
  } finally {
    emailServiceRunning = false;
  }
}

let emailInterval: NodeJS.Timeout | null = null;

export function startEmailService() {
  if (emailInterval) {
    console.log('Email service already started');
    return;
  }

  console.log('Starting email service...');
  
  // Run immediately on startup
  checkAndSendTaskEmails();
  
  // Then check every 2 hours
  emailInterval = setInterval(() => {
    checkAndSendTaskEmails();
  }, 2 * 60 * 60 * 1000); // 2 hours in milliseconds
  
  console.log('Email service started - checking every 2 hours');
}

export function stopEmailService() {
  if (emailInterval) {
    clearInterval(emailInterval);
    emailInterval = null;
    console.log('Email service stopped');
  }
}
