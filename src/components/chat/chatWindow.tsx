// components/chat/ChatWindow.tsx
"use client";

import { useEffect, useRef } from "react";
import { useInfiniteMessages } from "@/lib/hooks/useinfiniteScrollMessages";
import { Button } from "@/components/ui/button";

export function ChatWindow({
  threadId,
  myUserId,
}: {
  threadId: string;
  myUserId: string;
}) {
  const { messages, size, setSize, isValidating } =
    useInfiniteMessages(threadId);
  const topSentinel = useRef<HTMLDivElement>(null);
  const bottomAnchor = useRef<HTMLDivElement>(null);

  // scroll to bottom when thread changes
  useEffect(() => {
    bottomAnchor.current?.scrollIntoView({ block: "end" });
  }, [threadId]);

  // infinite scroll ↑
  useEffect(() => {
    if (!topSentinel.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setSize((s) => s + 1);
    });
    io.observe(topSentinel.current);
    return () => io.disconnect();
  }, [setSize]);

  async function send(body: string) {
    await fetch(`/api/chat/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* —— history —— */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        <div ref={topSentinel} />
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.authorId === myUserId ? "justify-end" : "justify-start"
            }`}
          >
            <p className="max-w-xs break-words rounded-lg bg-muted px-3 py-1 text-sm">
              {m.type === "PING" ? "🔔 Ping!" : m.body}
            </p>
          </div>
        ))}
        {isValidating && (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        )}
        <div ref={bottomAnchor} />
      </div>

      {/* —— composer —— */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem(
            "msg"
          ) as HTMLInputElement;
          const val = input.value.trim();
          if (val) await send(val);
          input.value = "";
        }}
        className="flex gap-2 border-t p-3"
      >
        <input
          name="msg"
          autoComplete="off"
          placeholder="Type a message…"
          className="flex-1 rounded-md border px-3 py-2"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
