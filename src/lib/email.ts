import { Resend } from 'resend';
import { Task, User, Project, Organization } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TaskWithRelations extends Task {
  user: User;
  project?: (Project & { 
    organization?: Organization | null 
  }) | null;
}

interface EmailNotificationRecord {
  taskId: string;
  userId: string;
  sentAt: Date;
  type: 'reminder' | 'overdue';
}

// Store email notifications in memory (in production, use Redis or database)
const emailNotifications = new Map<string, EmailNotificationRecord[]>();

export const getEmailNotificationKey = (taskId: string, type: 'reminder' | 'overdue') => {
  return `${taskId}-${type}`;
};

export const hasRecentEmailNotification = (taskId: string, type: 'reminder' | 'overdue', hoursThreshold: number = 24): boolean => {
  const key = getEmailNotificationKey(taskId, type);
  const notifications = emailNotifications.get(key) || [];
  
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursThreshold);
  
  return notifications.some(notification => notification.sentAt > cutoff);
};

export const recordEmailNotification = (taskId: string, userId: string, type: 'reminder' | 'overdue') => {
  const key = getEmailNotificationKey(taskId, type);
  const notifications = emailNotifications.get(key) || [];
  
  notifications.push({
    taskId,
    userId,
    sentAt: new Date(),
    type
  });
  
  // Keep only last 10 notifications per key
  if (notifications.length > 10) {
    notifications.splice(0, notifications.length - 10);
  }
  
  emailNotifications.set(key, notifications);
};

export const generateTaskReminderHTML = (task: TaskWithRelations): string => {
  const isOverdue = new Date() > new Date(task.dueAt);
  const dueDate = new Date(task.dueAt);
  const formattedDate = dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = dueDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const priorityColor = {
    LOW: '#6b7280',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444'
  }[task.priority];

  const statusColor = isOverdue ? '#ef4444' : '#f59e0b';
  const statusText = isOverdue ? 'OVERDUE' : 'DUE SOON';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task ${statusText}: ${task.name}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #000000;
                background-color: #ffffff;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #26D16D 0%, #22c55e 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
            }
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            .status-badge {
                display: inline-block;
                padding: 8px 16px;
                background-color: ${statusColor};
                color: white;
                border-radius: 20px;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 16px;
            }
            .content {
                padding: 40px 30px;
            }
            .task-card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                border-left: 4px solid #26D16D;
            }
            .task-title {
                font-size: 24px;
                font-weight: 700;
                color: #000000;
                margin-bottom: 12px;
            }
            .task-description {
                font-size: 16px;
                color: #4b5563;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            .task-meta {
                display: grid;
                gap: 12px;
            }
            .meta-row {
                display: flex;
                align-items: center;
                font-size: 14px;
            }
            .meta-label {
                font-weight: 600;
                color: #374151;
                min-width: 80px;
            }
            .meta-value {
                color: #6b7280;
                flex: 1;
            }
            .priority-badge {
                display: inline-block;
                padding: 4px 12px;
                background-color: ${priorityColor};
                color: white;
                border-radius: 12px;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
            }
            .due-date {
                font-size: 20px;
                font-weight: 700;
                color: ${statusColor};
                text-align: center;
                margin: 24px 0;
                padding: 16px;
                background-color: ${statusColor}08;
                border-radius: 8px;
                border: 2px solid ${statusColor}20;
            }
            .organization-info {
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 24px;
            }
            .org-title {
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin-bottom: 8px;
            }
            .project-title {
                font-size: 16px;
                color: #26D16D;
                font-weight: 600;
            }
            .cta-button {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #26D16D 0%, #22c55e 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 24px 0;
                box-shadow: 0 4px 12px rgba(38, 209, 109, 0.3);
                transition: all 0.3s ease;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(38, 209, 109, 0.4);
            }
            .footer {
                background-color: #f9fafb;
                padding: 24px 30px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
                border-top: 1px solid #e5e7eb;
            }
            .footer a {
                color: #26D16D;
                text-decoration: none;
            }
            .notes-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }
            .notes-title {
                font-size: 14px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
            }
            .notes-content {
                font-size: 14px;
                color: #6b7280;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Task ${statusText}</h1>
                <p>You have a high priority task that needs attention</p>
                <div class="status-badge">${statusText}</div>
            </div>
            
            <div class="content">
                ${task.project?.organization ? `
                    <div class="organization-info">
                        <div class="org-title">📁 ${task.project.organization.name}</div>
                        ${task.project ? `<div class="project-title">📋 ${task.project.name}</div>` : ''}
                    </div>
                ` : task.project ? `
                    <div class="organization-info">
                        <div class="project-title">📋 ${task.project.name}</div>
                    </div>
                ` : ''}
                
                <div class="task-card">
                    <div class="task-title">${task.name}</div>
                    <div class="task-description">${task.description}</div>
                    
                    <div class="task-meta">
                        <div class="meta-row">
                            <span class="meta-label">Priority:</span>
                            <span class="priority-badge">${task.priority}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Assigned to:</span>
                            <span class="meta-value">${task.user.firstName} ${task.user.lastName}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Status:</span>
                            <span class="meta-value">${task.completed ? 'Completed' : 'Pending'}</span>
                        </div>
                    </div>
                    
                    ${task.notes ? `
                        <div class="notes-section">
                            <div class="notes-title">📝 Additional Notes:</div>
                            <div class="notes-content">${task.notes}</div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="due-date">
                    🗓️ Due: ${formattedDate} at ${formattedTime}
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
                        View Task in Dashboard
                    </a>
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280;">
                    <p>Don't delay - complete this task to stay on track with your goals!</p>
                </div>
            </div>
            
            <div class="footer">
                <p>
                    This is an automated reminder from your ProductivityAI dashboard.<br>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings">Manage your notification preferences</a>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const sendTaskReminderEmail = async (task: TaskWithRelations) => {
  const isOverdue = new Date() > new Date(task.dueAt);
  const emailType = isOverdue ? 'overdue' : 'reminder';
  
  // Check if we've sent this type of email recently
  if (hasRecentEmailNotification(task.id, emailType, 12)) {
    console.log(`Skipping ${emailType} email for task ${task.id} - already sent recently`);
    return { success: false, reason: 'already_sent_recently' };
  }

  const subject = isOverdue 
    ? `⚠️ OVERDUE: ${task.name}`
    : `📅 Reminder: ${task.name} is due soon`;

  try {
    const emailHtml = generateTaskReminderHTML(task);
    
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'tasks@productivityai.com',
      to: [task.user.email],
      subject,
      html: emailHtml,
      text: `
Task ${isOverdue ? 'OVERDUE' : 'DUE SOON'}: ${task.name}

${task.description}

Priority: ${task.priority}
Due: ${new Date(task.dueAt).toLocaleString()}
Assigned to: ${task.user.firstName} ${task.user.lastName}

${task.project?.organization ? `Organization: ${task.project.organization.name}` : ''}
${task.project ? `Project: ${task.project.name}` : ''}

${task.notes ? `Notes: ${task.notes}` : ''}

View in dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard
      `.trim()
    });

    // Record that we sent this email
    recordEmailNotification(task.id, task.user.id, emailType);
    
    console.log(`Successfully sent ${emailType} email for task ${task.id} to ${task.user.email}`);
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    console.error(`Failed to send ${emailType} email for task ${task.id}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const shouldSendTaskReminder = (task: TaskWithRelations): boolean => {
  // Only send for high priority tasks
  if (task.priority !== 'HIGH') return false;
  
  // Don't send for completed tasks
  if (task.completed) return false;
  
  const now = new Date();
  const dueDate = new Date(task.dueAt);
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Send reminder if:
  // 1. Task is overdue (and hasn't been sent an overdue email recently)
  // 2. Task is due within 24 hours (and hasn't been sent a reminder recently)
  // 3. Task is due within 2 hours (more urgent, different threshold)
  
  if (hoursUntilDue < 0) {
    // Task is overdue
    return !hasRecentEmailNotification(task.id, 'overdue', 24);
  } else if (hoursUntilDue <= 2) {
    // Very urgent - within 2 hours
    return !hasRecentEmailNotification(task.id, 'reminder', 2);
  } else if (hoursUntilDue <= 24) {
    // Due within 24 hours
    return !hasRecentEmailNotification(task.id, 'reminder', 24);
  }
  
  return false;
};
