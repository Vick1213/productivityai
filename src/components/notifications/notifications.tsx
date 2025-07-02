"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { NotificationPopup } from "./NotificationPopup";

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

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    
    // Auto-dismiss after different times based on type
    const dismissTime = notification.type === "task" && notification.category === "overdue" 
      ? 10000 // 10 seconds for overdue tasks
      : 5000; // 5 seconds for others
      
    setTimeout(() => {
      dismissNotification(notification.id);
    }, dismissTime);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Poll for new chat messages
  useEffect(() => {
    if (!userId) return;

    const checkForNewMessages = async () => {
      try {
        const response = await fetch("/api/notifications/chat");
        if (response.ok) {
          const newMessages = await response.json();
          
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
      } catch (error) {
        console.error("Failed to check for new messages:", error);
      }
    };

    const interval = setInterval(checkForNewMessages, 100000);
    return () => clearInterval(interval);
  }, [userId]);

  // Check for due projects
  useEffect(() => {
    if (!userId) return;

    const checkForDueProjects = async () => {
      try {
        const response = await fetch("/api/notifications/projects");
        if (response.ok) {
          const dueProjects = await response.json();
          
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
      } catch (error) {
        console.error("Failed to check for due projects:", error);
      }
    };

    const interval = setInterval(checkForDueProjects, 30 * 60 * 1000);
    checkForDueProjects();
    return () => clearInterval(interval);
  }, [userId]);

  // Check for task reminders
  useEffect(() => {
    if (!userId) return;

    const checkForTaskReminders = async () => {
      try {
        const response = await fetch("/api/notifications/tasks");
        if (response.ok) {
          const taskData = await response.json();
          
          // Handle overdue tasks (most urgent)
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
        console.error("Failed to check for task reminders:", error);
      }
    };

    // Check every 15 minutes for tasks
    const interval = setInterval(checkForTaskReminders, 15 * 60 * 1000);
    checkForTaskReminders();
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{ notifications, dismissNotification, addNotification }}
    >
      {children}
      <NotificationPopup notifications={notifications} onDismiss={dismissNotification} />
    </NotificationContext.Provider>
  );
}