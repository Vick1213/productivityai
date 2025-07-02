"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./notifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, dismissNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.length;

  const handleNotificationClick = (notification: any) => {
    if (notification.type === "chat") {
      window.location.href = `/dashboard/team?chat=${notification.threadId}`;
    } else if (notification.type === "project") {
      window.location.href = `/dashboard/projects/${notification.projectId}`;
    }
    dismissNotification(notification.id);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-center gap-2 w-full">
                {notification.type === "chat" ? "💬" : "⏰"}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {notification.type === "chat" 
                      ? notification.authorName 
                      : "Project Due Soon"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.type === "chat" 
                      ? notification.message 
                      : `${notification.projectName} is due soon`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}