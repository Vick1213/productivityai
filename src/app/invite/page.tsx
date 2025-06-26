// app/invite/page.tsx  (app router)
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';

export default function InvitePage() {
    const href = typeof window !== 'undefined' ? window.location.href : '/invite';

  const params  = useSearchParams();
  const token   = params.get('token');
  const orgId   = params.get('org');
  const router  = useRouter();

  // once the user is signed-in, call API
  useEffect(() => {
    async function accept() {
      if (!token || !orgId) return;
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, orgId }),
      });
      if (res.ok) router.replace('/dashboard');
      else        router.replace('/404');
    }
    accept();
  }, [token, orgId, router]);

  return (
    <main className="grid place-items-center min-h-screen gap-4">
      <h1 className="text-xl font-semibold">Join organisation</h1>

      <SignedOut>
  <div className="flex gap-2">
    <SignInButton forceRedirectUrl={href}>Sign in</SignInButton>
    <SignUpButton forceRedirectUrl={href }>Sign up</SignUpButton>
  </div>
</SignedOut>

<SignedIn>
  <p>Adding you to the team…</p>
</SignedIn>
    </main>
  );
}
