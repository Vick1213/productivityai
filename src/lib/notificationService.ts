import { broadcastToUser } from '@/lib/notifications';
import prisma from '@/lib/prisma';

// Performance optimizations
const NOTIFICATION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes instead of constant checking
const MAX_NOTIFICATIONS_PER_RUN = 20; // Limit notifications processed per run
const NOTIFICATION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

interface ChatNotification {
  id: string;
  type: "chat";
  threadId: string;
  authorName: string;
  message: string;
  timestamp: Date;
}

interface ProjectNotification {
  id: string;
  type: "project";
  projectId: string;
  projectName: string;
  dueAt: Date;
  timestamp: Date;
}

interface TaskNotification {
  id: string;
  type: "task";
  taskId: string;
  taskName: string;
  dueAt?: Date;
  startsAt?: Date;
  priority: "LOW" | "MEDIUM" | "HIGH";
  category: "overdue" | "dueSoon" | "startingSoon";
  projectName?: string;
  timestamp: Date;
}

type Notification = ChatNotification | ProjectNotification | TaskNotification;

// Track which notifications we've already sent to avoid spam with expiry
const sentNotifications = new Map<string, number>(); // Map ID to timestamp

// Clean up old notification records periodically
function cleanupOldNotifications() {
  const now = Date.now();
  const cutoff = now - NOTIFICATION_CACHE_TTL;
  
  for (const [key, timestamp] of sentNotifications.entries()) {
    if (timestamp < cutoff) {
      sentNotifications.delete(key);
    }
  }
}

// Check for task notifications
export async function checkTaskNotifications() {
  try {
    // Clean up old notifications first
    cleanupOldNotifications();
    
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // More targeted queries with limits
    // Only check HIGH priority overdue tasks for immediate attention
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueAt: {
          lt: now,
        },
        completed: false,
        priority: 'HIGH', // Only high priority
      },
      select: {
        id: true,
        name: true,
        dueAt: true,
        priority: true,
        project: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
      take: 10, // Limit results
      orderBy: { dueAt: 'asc' } // Most overdue first
    });    // Get tasks due soon (within 1 hour) - only HIGH priority
    const tasksDueSoon = await prisma.task.findMany({
      where: {
        dueAt: {
          gte: now,
          lte: oneHourFromNow,
        },
        completed: false,
        priority: 'HIGH', // Only high priority
      },
      select: {
        id: true,
        name: true,
        dueAt: true,
        priority: true,
        project: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
      take: 10, // Limit results
      orderBy: { dueAt: 'asc' }
    });

    // Get tasks starting soon (within 1 hour) - only HIGH priority
    const tasksStartingSoon = await prisma.task.findMany({
      where: {
        startsAt: {
          gte: now,
          lte: oneHourFromNow,
        },
        completed: false,
        priority: 'HIGH', // Only high priority
      },
      select: {
        id: true,
        name: true,
        startsAt: true,
        priority: true,
        project: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
      take: 10, // Limit results
      orderBy: { startsAt: 'asc' }
    });

    // Send overdue task notifications
    overdueTasks.forEach((task) => {
      const notificationId = `task-overdue-${task.id}`;
      if (!sentNotifications.has(notificationId)) {
        const notification: TaskNotification = {
          id: notificationId,
          type: "task",
          taskId: task.id,
          taskName: task.name,
          dueAt: task.dueAt,
          priority: task.priority as "LOW" | "MEDIUM" | "HIGH",
          category: "overdue",
          projectName: task.project?.name,
          timestamp: new Date(),
        };
        
        broadcastToUser(task.user.id, notification);
        sentNotifications.set(notificationId, Date.now());
      }
    });

    // Send due soon notifications
    tasksDueSoon.forEach((task) => {
      const notificationId = `task-due-${task.id}`;
      if (!sentNotifications.has(notificationId)) {
        const notification: TaskNotification = {
          id: notificationId,
          type: "task",
          taskId: task.id,
          taskName: task.name,
          dueAt: task.dueAt,
          priority: task.priority as "LOW" | "MEDIUM" | "HIGH",
          category: "dueSoon",
          projectName: task.project?.name,
          timestamp: new Date(),
        };
        
        broadcastToUser(task.user.id, notification);
        sentNotifications.set(notificationId, Date.now());
      }
    });

    // Send starting soon notifications
    tasksStartingSoon.forEach((task) => {
      const notificationId = `task-start-${task.id}`;
      if (!sentNotifications.has(notificationId)) {
        const notification: TaskNotification = {
          id: notificationId,
          type: "task",
          taskId: task.id,
          taskName: task.name,
          startsAt: task.startsAt,
          priority: task.priority as "LOW" | "MEDIUM" | "HIGH",
          category: "startingSoon",
          projectName: task.project?.name,
          timestamp: new Date(),
        };
        
        broadcastToUser(task.user.id, notification);
        sentNotifications.set(notificationId, Date.now());
      }
    });

  } catch (error) {
    console.error('Error checking task notifications:', error);
  }
}

// Check for project notifications
export async function checkProjectNotifications() {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueProjects = await prisma.project.findMany({
      where: {
        dueAt: {
          gte: now,
          lte: tomorrow,
        },
      },
      include: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    dueProjects.forEach((project) => {
      const notificationId = `project-${project.id}`;
      if (!sentNotifications.has(notificationId)) {
        const notification: ProjectNotification = {
          id: notificationId,
          type: "project",
          projectId: project.id,
          projectName: project.name,
          dueAt: project.dueAt!,
          timestamp: new Date(),
        };

        // Send to all project users
        project.users.forEach((user) => {
          broadcastToUser(user.id, notification);
        });
        
        sentNotifications.set(notificationId, Date.now());
      }
    });

  } catch (error) {
    console.error('Error checking project notifications:', error);
  }
}

// Clean up old sent notifications
export function cleanupSentNotifications() {
  sentNotifications.clear();
}

// Note: Real-time notification service has been disabled to reduce compute costs on Vercel.
// The check functions above can still be called manually via API endpoints if needed.
// For production use, consider using Vercel Cron Jobs to periodically check notifications.
