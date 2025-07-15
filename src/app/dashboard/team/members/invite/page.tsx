/* app/team/members/invite/page.tsx */
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import InviteMembersForm from "./InviteMembersForm";

export const dynamic = "force-dynamic";

export default async function InviteMembersPage({
  searchParams,
}: {
  searchParams: { orgId?: string };
}) {
  /* 1️⃣  auth */
  const { userId } = await auth();
  if (!userId) return <p className="p-8">Not signed in.</p>;

  /* 2️⃣  resolve organization ID */
  let orgId = searchParams.orgId;

  // If no orgId in params, fall back to user's primary org or first membership
  if (!orgId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryOrgId: true },
    });

    orgId = user?.primaryOrgId ?? undefined;

    // — otherwise grab the first membership row
    if (!orgId) {
      const membership = await prisma.userOrganization.findFirst({
        where: { userId },
        select: { orgId: true },
      });
      orgId = membership?.orgId ?? undefined;
    }
  }

  if (!orgId) return <p className="p-8">No organisation found.</p>;

  // Verify user has access to this organization
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
  });

  if (!membership) {
    return <p className="p-8">You don't have access to this organization.</p>;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return <p className="p-8">No organisation found.</p>;

  /* 3️⃣  render */
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-2xl font-semibold">
        Invite members to{" "}
        <span className="text-blue-600">{org.name}</span>
      </h1>

      {/* Suspense keeps app-router happy even though the form isn't streaming */}
      <Suspense fallback={null}>
        <InviteMembersForm orgId={org.id} />
      </Suspense>
    </div>
  );
}
