"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PanelLeftIcon,
  PanelLeftCloseIcon,
  SendHorizonalIcon,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

/**
 * ChatAssistantPage – /dashboard/chat
 * ---------------------------------------------------------------
 * A two-pane chat interface inspired by ChatGPT:
 *   • **Collapsible sidebar** lists previous conversations
 *   • Main panel hosts the chat thread + composer
 *   • Assistant replies may embed a JSON code-fence – when detected we
 *     POST the payload to /api/tasks so the dashboard gets new tasks 🔄
 *
 * Tasks JSON schema (flexible → adapt to your Prisma model):
 *   ```json
 *   {
 *     "tasks": [
 *       {
 *         "name": "Finish pitch deck",
 *         "description": "Add TAM slide & metrics",
 *         "dueDate": "2025-06-02T17:00:00Z"
 *       },
 *       ...
 *     ]
 *   }
 *   ```
 */
export default function ChatAssistantPage() {
  const [convos, setConvos] = useState<{ id: string; title: string }[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  /*──────────────────────────────────────────── scrolling */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /*──────────────────────────────────────────── helpers */
  const startNewConvo = () => {
    const id = crypto.randomUUID();
    setConvos((c) => [...c, { id, title: "Untitled chat" }]);
    setCurrentId(id);
    setMessages([]);
  };

  const saveTitle = (firstAssistantMsg: string) => {
    setConvos((c) =>
      c.map((conv) =>
        conv.id === currentId && conv.title === "Untitled chat"
          ? { ...conv, title: firstAssistantMsg.slice(0, 40) + "…" }
          : conv
      )
    );
  };

  const parseTaskJson = async (text: string) => {
    const match = text.match(/```json([\s\S]*?)```/);
    if (!match) return;
    try {
      const payload = JSON.parse(match[1]);
      if (Array.isArray(payload.tasks)) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.tasks),
        });
        if (res.ok) toast.success("Tasks created! Check your dashboard");
      }
    } catch (err) {
      console.error("Invalid task JSON", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg] }),
    });
    if (!res.ok) return toast.error("Assistant error");
    const data = await res.json(); // { reply: "..." }

    const assistantMsg = { role: "assistant" as const, content: data.reply };
    setMessages((m) => [...m, assistantMsg]);
    if (messages.filter((m) => m.role === "assistant").length === 0) {
      saveTitle(data.reply);
    }
    parseTaskJson(data.reply);
  };

  /** UI **/
  return (
    <div className="flex h-[calc(100vh-48px)] bg-background">
      {/* Sidebar */}
      <aside
        className={clsx(
          "border-r bg-muted/40 transition-all duration-300 overflow-y-auto",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        {sidebarOpen && (
          <div className="p-4 flex flex-col gap-4">
            <Button size="sm" variant="secondary" onClick={startNewConvo}>
              + New chat
            </Button>
            <ul className="space-y-2">
              {convos.map((c) => (
                <li
                  key={c.id}
                  className={clsx(
                    "px-3 py-2 rounded cursor-pointer hover:bg-muted",
                    c.id === currentId && "bg-muted"
                  )}
                  onClick={() => setCurrentId(c.id)}
                >
                  {c.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col relative">
        {/* Collapse toggle */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 left-2 z-10"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? <PanelLeftCloseIcon /> : <PanelLeftIcon />}
        </Button>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={clsx(
                "prose max-w-none whitespace-pre-wrap",
                m.role === "user" ? "text-right ml-auto" : "text-left mr-auto"
              )}
            >
              {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t p-4 flex gap-3">
          <Textarea
            className="flex-1 resize-none h-20"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Productivity AI…"
          />
          <Button onClick={sendMessage} disabled={!input.trim()}>
            Send <SendHorizonalIcon className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/*──────────────────────────────────────────── placement
app/
└─ dashboard/
   └─ chat/
      └─ page.tsx   ← put this file here (rename accordingly)

API ROUTES (sketch)
-------------------
// app/api/assistant/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json();
  const reply = await callOpenAI(messages); // implement
  return Response.json({ reply });
}

// app/api/tasks/route.ts
export async function POST(req: Request) {
  const tasks = await req.json();
  // use auth() to get userId, then prisma.task.createMany({ data: tasks.map(t => ({ ...t, userId })) })
  return new Response(null, { status: 204 });
}
*/