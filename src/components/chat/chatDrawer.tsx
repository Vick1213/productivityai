// components/chat/ChatDrawer.tsx
"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./chatWindow";

export function ChatDrawer({
  open,
  onOpenChange,
  threadId,
  title,
  myUserId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  threadId?: string;
  title?: string;
  myUserId: string;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title ?? "Direct message"}</DrawerTitle>
          <DrawerClose asChild>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-4 top-4"
            >
              ✕
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {threadId && (
          <div className="h-[70vh]"> {/* fixed height for scroll area */}
            <ChatWindow threadId={threadId} myUserId={myUserId} />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
