// app/team/members/invite/page.tsx
import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import InviteMembersForm from './InviteMembersForm';

export const dynamic = 'force-dynamic';

export default async function InviteMembersPage() {
  const { userId } = await auth();
  if (!userId) return <p className="p-8">Not signed in.</p>;

  const org = await prisma.organization.findFirst({
    where: { users: { some: { id: userId } } },
    select: { id: true, name: true },
  });
  if (!org) return <p className="p-8">No organisation found.</p>;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">
        Invite members to <span className="text-blue-600">{org.name}</span>
      </h1>

      {/* Suspense not strictly required here, but keeps build happy */}
      <Suspense fallback={null}>
        <InviteMembersForm orgId={org.id} />
      </Suspense>
    </div>
  );
}
