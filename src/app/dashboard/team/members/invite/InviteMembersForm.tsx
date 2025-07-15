'use client';

import { useState, useTransition } from 'react';

export default function InviteMembersForm({ orgId }: { orgId: string }) {
  const [input, setInput] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = input
      .split(/[,\s]+/)
      .map(e => e.trim())
      .filter(Boolean);

    if (!emails.length) return;

    start(async () => {
      const res = await fetch('/api/team/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, emails, isClient }),
      });

      if (res.ok) {
        setMsg(`Invites sent${isClient ? ' (as client)' : ''}!`);
        setInput('');
        setIsClient(false);
      } else {
        const { error } = await res.json();
        setMsg(error || 'Error sending invites');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Email addresses (comma or space separated):
        </label>
        <textarea
          className="w-full border rounded p-2"
          rows={4}
          placeholder="alice@example.com bob@example.com …"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isClient"
          checked={isClient}
          onChange={e => setIsClient(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="isClient" className="text-sm font-medium">
          Invite as client (limited access to AI, Analytics, Settings, and Teams only)
        </label>
      </div>
      
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {isPending ? 'Sending…' : `Send ${isClient ? 'client ' : ''}invites`}
      </button>
      {msg && <p className="text-sm mt-1">{msg}</p>}
    </form>
  );
}
