'use client';

import { useState, useTransition } from 'react';

export default function InviteMembersForm({ orgId }: { orgId: string }) {
  const [input, setInput] = useState('');
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
        body: JSON.stringify({ orgId, emails }),
      });

      if (res.ok) {
        setMsg('Invites sent!');
        setInput('');
      } else {
        const { error } = await res.json();
        setMsg(error || 'Error sending invites');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <textarea
        className="w-full border rounded p-2"
        rows={4}
        placeholder="alice@example.com bob@example.com …"
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {isPending ? 'Sending…' : 'Send invites'}
      </button>
      {msg && <p className="text-sm mt-1">{msg}</p>}
    </form>
  );
}
