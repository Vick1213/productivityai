"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
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

type Notification = ChatNotification | ProjectNotification;

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
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification(notification.id);
    }, 5000);
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

    // Check every 10 seconds
    const interval = setInterval(checkForNewMessages, 10000);
    
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

    // Check every 30 minutes
    const interval = setInterval(checkForDueProjects, 30 * 60 * 1000);
    // Check immediately on mount
    checkForDueProjects();
    
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