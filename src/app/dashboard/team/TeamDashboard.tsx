/* app/(dashboard)/team/TeamDashboard.tsx */
'use client';

import { useState } from 'react';
import useOrganisation from '@/lib/hooks/useOrganisations';   // ✅ correct hook
import { useAuth } from '@clerk/nextjs';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Member, Project } from '@/types/team';
import { ChatDrawer } from '@/components/chat/chatDrawer';
import { NewProjectDialog } from '@/components/project/NewProjectDialog';
import { ProjectPanel } from '@/components/dashboard/project-panel';

/* ───────────────────────── Team dashboard ───────────────────────── */
export default function TeamDashboard({
  orgId,
  onBack,
}: {
  orgId: string;
  onBack?: () => void;
}) {
  const { data: organization, isLoading, error } = useOrganisation(orgId);
  const { userId: myUserId } = useAuth();

  /* chat drawer state */
  const [chatTarget, setChatTarget] = useState<{
    threadId: string;
    name: string;
  } | null>(null);

  /* —— skeleton / errors ——————————————————————— */
  if (isLoading) return <Center text="Loading team data…" />;
  if (error || !organization)
    return <Center text="Error fetching organisation" isError />;

  /* —— render ———————————————————————————————— */
  return (
    <>
      <div className="space-y-6 p-6">
        {/* header */}
        <header className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Organisations
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {organization.name}
            </h1>
            <p className="text-muted-foreground">
              {organization.members.length} members ·{' '}
              {organization.projects.length} projects
            </p>
          </div>
        </header>

        {/* tabs */}
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Members */}
          <TabsContent value="members" className="mt-6">
            <MembersPane
              members={organization.members}
              onOpenChat={async (m) => {
                const { threadId } = await ensureDmThread(m.id);
                setChatTarget({
                  threadId,
                  name: `${m.firstName} ${m.lastName}`,
                });
              }}
              onPing={(m) => console.log('Ping!', m)}
            />
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects" className="mt-6">
            <div className="mb-4">
              <NewProjectDialog
                members={organization.members}
                onSuccess={async () => {
                  const fresh = await fetch(`/api/orgs/${orgId}`).then((r) =>
                    r.json()
                  );
                 
                  
                  // @ts-ignore – mutate local copy
                  organization.projects = fresh.projects;
                }}
                 currentOrgId = {orgId}  // pass orgId to dialog
              />
            </div>
            <ProjectsPane
              projects={organization.projects}
              members={organization.members}
            />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-6">
            <ComingSoon icon="⚙️" title="Team Settings" />
          </TabsContent>
        </Tabs>
      </div>

      {/* chat drawer */}
      <ChatDrawer
        open={!!chatTarget}
        onOpenChange={() => setChatTarget(null)}
        threadId={chatTarget?.threadId}
        title={chatTarget?.name}
        myUserId={myUserId || ''}
      />
    </>
  );
}

/* ─────────── Projects pane (wraps ProjectPanel) ─────────── */
function ProjectsPane({
  projects,
  members,
}: {
  projects: Project[];
  members: Member[];
}) {
  const panelData = projects.map((p) => ({
    ...p,
    tasks: Array.isArray((p as any).tasks) ? (p as any).tasks.slice(0, 3) : [],
  })) as any;
  return <ProjectPanel projects={panelData} />;
}

/* ─────────── Members pane ─────────── */
function MembersPane({
  members,
  onOpenChat,
  onPing,
}: {
  members: Member[];
  onOpenChat: (m: Member) => void;
  onPing: (m: Member) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {members.map((m) => (
        <Card key={m.id} className="group relative p-4 hover:shadow-md">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={m.avatarUrl ?? undefined} alt={m.firstName} />
              <AvatarFallback>
                {m.firstName[0]}
                {m.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1 overflow-hidden">
              <CardTitle className="truncate text-base">
                {m.firstName} {m.lastName}
              </CardTitle>
              {m.jobTitle && (
                <p className="truncate text-sm text-muted-foreground">
                  {m.jobTitle}
                </p>
              )}
            </div>
            {m.role && (
              <Badge className="shrink-0" variant="secondary">
                {m.role}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onOpenChat(m)}>
                💬 Message
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onPing(m)}>
                📣 Ping
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Card>
      ))}

      <Link href="/dashboard/team/members/invite">
        <Card className="group flex cursor-pointer items-center justify-center border-dashed p-4 text-muted-foreground transition hover:bg-muted">
          + Invite member
        </Card>
      </Link>
    </div>
  );
}

/* ─────────── tiny helpers ─────────── */
function Center({
  text,
  isError,
}: {
  text: string;
  isError?: boolean;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <p className={isError ? 'text-red-500' : 'text-muted-foreground'}>
        {text}
      </p>
    </div>
  );
}

function ComingSoon({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm">Feature coming soon!</p>
    </div>
  );
}

/* ensure DM thread exists */
async function ensureDmThread(memberId: string) {
  const res = await fetch('/api/chat/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberIds: [memberId] }),
  });
  const data = await res.json();
  return { threadId: data.id };
}
