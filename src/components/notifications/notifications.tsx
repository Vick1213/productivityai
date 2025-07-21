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
  const [shownNotifications, setShownNotifications] = useState<Map<string, Date>>(new Map());
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const { userId } = useAuth();

  // Load shown notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      const stored = localStorage.getItem(`notifications-shown-${userId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const map = new Map<string, Date>();
          Object.entries(parsed).forEach(([key, value]) => {
            map.set(key, new Date(value as string));
          });
          setShownNotifications(map);
        } catch (error) {
          console.error('Failed to parse stored notifications:', error);
        }
      }
    }
  }, [userId]);

  // Save shown notifications to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && userId && shownNotifications.size > 0) {
      const obj: Record<string, string> = {};
      shownNotifications.forEach((date, key) => {
        obj[key] = date.toISOString();
      });
      localStorage.setItem(`notifications-shown-${userId}`, JSON.stringify(obj));
    }
  }, [shownNotifications, userId]);

  const addNotification = useCallback((notification: Notification) => {
    // Use the notification ID as the rate limiting key
    const baseId = notification.id;
    const now = new Date();
    
    // Rate limiting: don't show the same notification more than once per 5 minutes
    const lastShown = shownNotifications.get(baseId);
    if (lastShown && (now.getTime() - lastShown.getTime()) < 5 * 60 * 1000) {
      return; // Skip this notification
    }
    
    // Check if notification with same ID already exists in current notifications
    setNotifications((prev) => {
      if (prev.some(n => n.id === notification.id)) {
        return prev; // Don't add exact duplicate
      }
      return [notification, ...prev];
    });
    
    // Mark as shown with current timestamp
    setShownNotifications(prev => new Map(prev).set(baseId, now));
    
    // Auto-dismiss after different times based on type
    const dismissTime = notification.type === "task" && notification.category === "overdue" 
      ? 10000 // 10 seconds for overdue tasks
      : 5000; // 5 seconds for others
      
    setTimeout(() => {
      dismissNotification(notification.id);
    }, dismissTime);
  }, [shownNotifications]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Keep the notification in shownNotifications to prevent it from reappearing
  };

  // Use SSE stream for real-time notifications
  const { isConnected } = useNotificationStream(addNotification);

  // Clean up old shown notifications every hour to prevent memory bloat
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Clear notifications that are more than 24 hours old based on timestamp
      setShownNotifications(prev => {
        const yesterday = Date.now() - 24 * 60 * 60 * 1000;
        const newMap = new Map<string, Date>();
        
        // Only keep notifications from the last 24 hours
        prev.forEach((timestamp, id) => {
          if (timestamp.getTime() > yesterday) {
            newMap.set(id, timestamp);
          }
        });
        
        // Persist the cleaned data immediately
        if (typeof window !== 'undefined' && userId && newMap.size !== prev.size) {
          const obj: Record<string, string> = {};
          newMap.forEach((date, key) => {
            obj[key] = date.toISOString();
          });
          localStorage.setItem(`notifications-shown-${userId}`, JSON.stringify(obj));
        }
        
        return newMap;
      });
    }, 60 * 60 * 1000); // Clean up every hour

    return () => clearInterval(cleanup);
  }, [userId]);

  // Fallback: periodically check for notifications if SSE is not connected
  useEffect(() => {
    if (!userId || isConnected) return;

    const checkForNotifications = async () => {
      try {
        const currentTime = new Date();
        const sinceParam = lastFetchTime.toISOString();
        
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

        // Check for task notifications with timestamp filtering
        const taskResponse = await fetch(`/api/notifications/tasks?since=${encodeURIComponent(sinceParam)}`);
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
        
        // Update the last fetch time
        setLastFetchTime(currentTime);
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