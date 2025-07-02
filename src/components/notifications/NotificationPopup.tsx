"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

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

interface NotificationPopupProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationPopup({ notifications, onDismiss }: NotificationPopupProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Show only the 3 most recent notifications
    setVisibleNotifications(notifications.slice(0, 3));
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === "chat") {
      window.location.href = `/dashboard/team?chat=${notification.threadId}`;
    } else if (notification.type === "project") {
      window.location.href = `/dashboard/projects/${notification.projectId}`;
    } else if (notification.type === "task") {
      window.location.href = `/dashboard/tasks?task=${notification.taskId}`;
    }
    onDismiss(notification.id);
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case "chat":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "project":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "task":
        if (notification.category === "overdue") {
          return <AlertTriangle className="h-4 w-4 text-red-500" />;
        }
        if (notification.category === "startingSoon") {
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        }
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getNotificationContent = (notification: Notification) => {
    if (notification.type === "chat") {
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">{notification.authorName}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        </div>
      );
    } else if (notification.type === "project") {
      const timeUntilDue = formatDistanceToNow(notification.dueAt, { addSuffix: true });
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">Project Due Soon</p>
          <p className="text-xs text-muted-foreground">
            {notification.projectName} is due {timeUntilDue}
          </p>
        </div>
      );
    } else if (notification.type === "task") {
      let title = "";
      let description = "";
      
      switch (notification.category) {
        case "overdue":
          title = "Overdue Task";
          description = `${notification.taskName} was due ${formatDistanceToNow(notification.dueAt!, { addSuffix: true })}`;
          break;
        case "dueSoon":
          title = "Task Due Soon";
          description = `${notification.taskName} is due ${formatDistanceToNow(notification.dueAt!, { addSuffix: true })}`;
          break;
        case "startingSoon":
          title = "Task Starting Soon";
          description = `${notification.taskName} starts ${formatDistanceToNow(notification.startsAt!, { addSuffix: true })}`;
          break;
      }

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{title}</p>
            <Badge variant={notification.priority === "HIGH" ? "destructive" : notification.priority === "MEDIUM" ? "default" : "secondary"} className="text-xs">
              {notification.priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
          {notification.projectName && (
            <p className="text-xs text-muted-foreground">
              Project: {notification.projectName}
            </p>
          )}
        </div>
      );
    }
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed left-4 top-20 z-50 space-y-2 w-80">
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <Card 
              className="cursor-pointer shadow-lg border-l-4 border-l-primary hover:shadow-xl transition-shadow"
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getNotificationIcon(notification)}
                    <div className="flex-1 min-w-0">
                      {getNotificationContent(notification)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(notification.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}