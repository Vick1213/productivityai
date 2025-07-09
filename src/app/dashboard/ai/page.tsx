'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  PanelLeftIcon,
  PanelLeftCloseIcon,
  SendHorizonalIcon,
  SparklesIcon,
  BrainIcon,
  ListTodoIcon,
  FolderIcon,
  UsersIcon,
  TrendingUpIcon
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const SUGGESTED_PROMPTS = [
  { icon: ListTodoIcon, text: "Show me my overdue tasks", category: "Tasks" },
  { icon: FolderIcon, text: "Analyze my current projects", category: "Projects" },
  { icon: TrendingUpIcon, text: "Create a task for tomorrow's client meeting", category: "Create" },
  { icon: UsersIcon, text: "How is my team performing?", category: "Analytics" },
  { icon: BrainIcon, text: "Suggest improvements for my high-priority tasks", category: "AI Insights" },
];

/**
 * ChatAssistantPage – /dashboard/ai
 * ---------------------------------------------------------------
 * Talks to our `/api/assistant` endpoint which uses OpenAI
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
    setConvos((c) => [...c, { id, title: 'New AI Chat' }]);
    setCurrentId(id);
    setMessages([]);
  };

  const saveTitle = (firstAssistantMsg: string) => {
    setConvos((c) =>
      c.map((conv) =>
        conv.id === currentId && conv.title === 'New AI Chat'
          ? { ...conv, title: firstAssistantMsg.slice(0, 40) + '…' }
          : conv,
      ),
    );
  };

  const handleSuggestedPrompt = (promptText: string) => {
    setInput(promptText);
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
        // Use POST for conversation context if we have existing messages
        if (messages.length > 0) {
          const res = await fetch('/api/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, prompt })
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Assistant error');
          }
          
          const data = await res.json();
          const assistantMsg = {
            role: (data.role ?? 'assistant') as 'assistant',
            content: data.content ?? '',
          };
          setMessages((m) => [...m, assistantMsg]);
        } else {
          // Use GET for first message
          const res = await fetch(`/api/assistant?q=${encodeURIComponent(prompt)}`);
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Assistant error');
          }
          
          const data = await res.json();
          const assistantMsg = {
            role: (data.role ?? 'assistant') as 'assistant',
            content: data.content ?? '',
          };
          setMessages((m) => [...m, assistantMsg]);
          
          // Save title from first response
          if (assistantMsg.content) {
            saveTitle(assistantMsg.content);
          }
        }
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Assistant error';
        toast.error(errorMessage);
        
        // Add error message to chat
        setMessages((m) => [...m, {
          role: 'assistant' as const,
          content: `Sorry, I encountered an error: ${errorMessage}`
        }]);
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
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="mb-8">
                <SparklesIcon className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">AI Productivity Assistant</h2>
                <p className="text-muted-foreground max-w-md">
                  I can help you manage tasks, analyze projects, create new items, and provide insights based on your data.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => {
                  const IconComponent = prompt.icon;
                  return (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-auto p-4 justify-start text-left"
                      onClick={() => handleSuggestedPrompt(prompt.text)}
                    >
                      <div className="flex items-start gap-3">
                        <IconComponent className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">{prompt.text}</div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {prompt.category}
                          </Badge>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div
              key={i}
              className={clsx(
                'max-w-none',
                m.role === 'user' 
                  ? 'ml-auto bg-primary text-primary-foreground p-4 rounded-lg max-w-[80%]' 
                  : 'mr-auto bg-muted p-4 rounded-lg max-w-[90%]',
              )}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="flex gap-3 border-t p-4">
          <Textarea
            className="min-h-[60px] flex-1 resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about your tasks, projects, or teams... (Press Enter to send, Shift+Enter for new line)"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isPending}
            size="lg"
          >
            {isPending ? (
              <SparklesIcon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send <SendHorizonalIcon className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
