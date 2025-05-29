'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  PanelLeftIcon,
  PanelLeftCloseIcon,
  SendHorizonalIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

/**
 * ChatAssistantPage – /dashboard/chat
 * ---------------------------------------------------------------
 * Talks to our `/api/ai` endpoint (GET ?q=…) which in turn uses OpenAI
 * function-calling to create tasks, list projects, etc.
 */
export default function ChatAssistantPage() {
  // ───────── state
  const [convos, setConvos] = useState<{ id: string; title: string }[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // ───────── auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ───────── helpers
  const startNewConvo = () => {
    const id = crypto.randomUUID();
    setConvos((c) => [...c, { id, title: 'Untitled chat' }]);
    setCurrentId(id);
    setMessages([]);
  };

  const saveTitle = (firstAssistantMsg: string) => {
    setConvos((c) =>
      c.map((conv) =>
        conv.id === currentId && conv.title === 'Untitled chat'
          ? { ...conv, title: firstAssistantMsg.slice(0, 40) + '…' }
          : conv,
      ),
    );
  };

  // ───────── send
  const sendMessage = async () => {
    if (!input.trim()) return;

    const prompt = input.trim();
    const userMsg = { role: 'user' as const, content: prompt };
    setMessages((m) => [...m, userMsg]);
    setInput('');

    startTransition(async () => {
      try {
        const res = await fetch(`/api/ai?q=${encodeURIComponent(prompt)}`);
        if (!res.ok) throw new Error('Assistant error');
        const data = await res.json(); // { role: 'assistant', content: '...' }

        const assistantMsg = {
          role: (data.role ?? 'assistant') as 'assistant',
          content: data.content ?? '',
        };
        setMessages((m) => [...m, assistantMsg]);

        if (messages.filter((m) => m.role === 'assistant').length === 0) {
          saveTitle(assistantMsg.content);
        }
      } catch (err) {
        console.error(err);
        toast.error('Assistant error');
      }
    });
  };

  // ───────── UI
  return (
    <div className="flex h-[calc(100vh-48px)] bg-background">
      {/* Sidebar */}
      <aside
        className={clsx(
          'overflow-y-auto border-r bg-muted/40 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0',
        )}
      >
        {sidebarOpen && (
          <div className="flex flex-col gap-4 p-4">
            <Button size="sm" variant="secondary" onClick={startNewConvo}>
              + New chat
            </Button>
            <ul className="space-y-2">
              {convos.map((c) => (
                <li
                  key={c.id}
                  className={clsx(
                    'cursor-pointer rounded px-3 py-2 hover:bg-muted',
                    c.id === currentId && 'bg-muted',
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
      <div className="relative flex flex-1 flex-col">
        {/* Collapse btn */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-2 top-2 z-10"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? <PanelLeftCloseIcon /> : <PanelLeftIcon />}
        </Button>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={clsx(
                'prose max-w-none whitespace-pre-wrap',
                m.role === 'user' ? 'ml-auto text-right' : 'mr-auto text-left',
              )}
            >
              {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="flex gap-3 border-t p-4">
          <Textarea
            className="h-20 flex-1 resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Productivity AI…"
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isPending}>
            Send <SendHorizonalIcon className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
