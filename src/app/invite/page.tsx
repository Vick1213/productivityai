import { Suspense } from 'react';
import InviteJoin from './InviteJoin';   // ──► (next file)

export const dynamic = 'force-dynamic';  // because this page depends on URL params

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <InviteJoin />
    </Suspense>
  );
}
