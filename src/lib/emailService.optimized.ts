import prisma from '@/lib/prisma';
import { sendTaskReminderEmail, shouldSendTaskReminder } from '@/lib/email';

let emailServiceRunning = false;
let emailServiceInterval: NodeJS.Timeout | null = null;

// Optimize email check frequency and limits
const EMAIL_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes instead of 2 hours
const MAX_EMAILS_PER_RUN = 10; // Limit emails per execution

export async function checkAndSendTaskEmails() {
  if (emailServiceRunning) {
    console.log('Email service already running, skipping...');
    return;
  }

  emailServiceRunning = true;
  console.log('Starting optimized task email reminder check...');

  try {
    // More targeted query - only check truly urgent tasks (2 hours instead of 24)
    const urgentCutoff = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    
    const tasks = await prisma.task.findMany({
      where: {
        priority: 'HIGH',
        completed: false,
        dueAt: {
          lte: urgentCutoff // Only urgent tasks
        }
      },
      include: {
        user: true,
        project: {
          include: {
            organization: true
          }
        }
      },
      take: MAX_EMAILS_PER_RUN, // Limit the number of tasks processed
      orderBy: { dueAt: 'asc' } // Process most urgent first
    });

    console.log(`Found ${tasks.length} urgent high priority tasks`);

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
    return { success: true, emailsSent, tasksChecked: tasks.length };
    
  } catch (error) {
    console.error('Error in email service:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    emailServiceRunning = false;
  }
}

export function startEmailService() {
  if (emailServiceInterval) {
    console.log('Email service already started');
    return;
  }

  console.log('Starting optimized email service...');
  
  // Run immediately on startup
  checkAndSendTaskEmails();
  
  // Then check every 15 minutes instead of 2 hours for better responsiveness
  emailServiceInterval = setInterval(() => {
    checkAndSendTaskEmails();
  }, EMAIL_CHECK_INTERVAL);
  
  console.log(`Email service started - checking every ${EMAIL_CHECK_INTERVAL / 60000} minutes`);
}

export function stopEmailService() {
  if (emailServiceInterval) {
    clearInterval(emailServiceInterval);
    emailServiceInterval = null;
    console.log('Email service stopped');
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  stopEmailService();
});

process.on('SIGINT', () => {
  stopEmailService();
});
