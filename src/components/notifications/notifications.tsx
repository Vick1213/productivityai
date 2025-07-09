"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { NotificationPopup } from "./NotificationPopup";
import { useNotificationStream } from "../../lib/hooks/useNotificationStream";

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

interface NotificationContextType {
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { userId } = useAuth();

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    
    // Auto-dismiss after different times based on type
    const dismissTime = notification.type === "task" && notification.category === "overdue" 
      ? 10000 // 10 seconds for overdue tasks
      : 5000; // 5 seconds for others
      
    setTimeout(() => {
      dismissNotification(notification.id);
    }, dismissTime);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Use SSE stream for real-time notifications
  const { isConnected } = useNotificationStream(addNotification);

  // Fallback: periodically check for notifications if SSE is not connected
  useEffect(() => {
    if (!userId || isConnected) return;

    const checkForNotifications = async () => {
      try {
        // Check for chat notifications
        const chatResponse = await fetch("/api/notifications/chat");
        if (chatResponse.ok) {
          const newMessages = await chatResponse.json();
          
          newMessages.forEach((msg: any) => {
            const notification: ChatNotification = {
              id: `chat-${msg.id}`,
              type: "chat",
              threadId: msg.threadId,
              authorName: `${msg.author.firstName} ${msg.author.lastName}`,
              message: msg.body || "📣 Ping!",
              timestamp: new Date(msg.createdAt),
            };
            addNotification(notification);
          });
        }

        // Check for project notifications
        const projectResponse = await fetch("/api/notifications/projects");
        if (projectResponse.ok) {
          const dueProjects = await projectResponse.json();
          
          dueProjects.forEach((project: any) => {
            const notification: ProjectNotification = {
              id: `project-${project.id}`,
              type: "project",
              projectId: project.id,
              projectName: project.name,
              dueAt: new Date(project.dueAt),
              timestamp: new Date(),
            };
            addNotification(notification);
          });
        }

        // Check for task notifications
        const taskResponse = await fetch("/api/notifications/tasks");
        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          
          // Handle overdue tasks
          taskData.overdue?.forEach((task: any) => {
            const notification: TaskNotification = {
              id: `task-overdue-${task.id}`,
              type: "task",
              taskId: task.id,
              taskName: task.name,
              dueAt: new Date(task.dueAt),
              priority: task.priority,
              category: "overdue",
              projectName: task.project?.name,
              timestamp: new Date(),
            };
            addNotification(notification);
          });

          // Handle tasks due soon
          taskData.dueSoon?.forEach((task: any) => {
            const notification: TaskNotification = {
              id: `task-due-${task.id}`,
              type: "task",
              taskId: task.id,
              taskName: task.name,
              dueAt: new Date(task.dueAt),
              priority: task.priority,
              category: "dueSoon",
              projectName: task.project?.name,
              timestamp: new Date(),
            };
            addNotification(notification);
          });

          // Handle tasks starting soon
          taskData.startingSoon?.forEach((task: any) => {
            const notification: TaskNotification = {
              id: `task-start-${task.id}`,
              type: "task",
              taskId: task.id,
              taskName: task.name,
              startsAt: new Date(task.startsAt),
              priority: task.priority,
              category: "startingSoon",
              projectName: task.project?.name,
              timestamp: new Date(),
            };
            addNotification(notification);
          });
        }
      } catch (error) {
        console.error("Failed to check for notifications:", error);
      }
    };

    // Only poll as fallback when SSE is not connected
    const interval = setInterval(checkForNotifications, 60000); // Check every minute as fallback
    checkForNotifications();
    
    return () => clearInterval(interval);
  }, [userId, isConnected, addNotification]);

  return (
    <NotificationContext.Provider
      value={{ notifications, dismissNotification, addNotification }}
    >
      {children}
      <NotificationPopup notifications={notifications} onDismiss={dismissNotification} />
    </NotificationContext.Provider>
  );
}