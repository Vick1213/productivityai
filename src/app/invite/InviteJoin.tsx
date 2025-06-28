'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useAuth,            // 👈  new
} from '@clerk/nextjs';

export default function InviteJoin() {
  const params  = useSearchParams();
  const token   = params.get('token');
  const orgId   = params.get('org');
  const router  = useRouter();
  const { isSignedIn } = useAuth();     // 👈  new

  /* ------------------------------------------
   * Run only after sign-in is complete
   * ---------------------------------------- */
  useEffect(() => {
    if (!isSignedIn) return;            // 👈  bail out if not signed-in
    if (!token || !orgId) return;

    (async () => {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, orgId }),
      });

      router.replace(res.ok ? '/dashboard' : '/404');
    })();
  }, [isSignedIn, token, orgId, router]);

  const href =
    typeof window !== 'undefined' ? window.location.href : '/invite';

  return (
    <main className="grid place-items-center min-h-screen gap-4">
      <h1 className="text-xl font-semibold">Join organisation</h1>

      <SignedOut>
        <p>Please sign in (or create an account) to accept your invitation.</p>
        <div className="flex gap-2">
          <SignInButton forceRedirectUrl={href}>Sign in</SignInButton>
          <SignUpButton  forceRedirectUrl={href}>Sign up</SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <p>Adding you to the team…</p>
      </SignedIn>
    </main>
  );
}
