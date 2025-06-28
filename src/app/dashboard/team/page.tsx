// app/(dashboard)/team/page.tsx
'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { AddTaskDrawer } from "@/components/task/AddTaskDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { ChatDrawer } from "@/components/chat/chatDrawer";

import { Member, Organization, Project } from "@/types/team";
import { useAuth } from "@clerk/nextjs";
import { AssignUserSelect } from "@/components/task/AssignUserSelect";
import { useProjectTasks } from "@/lib/hooks/useProjectTasks";
import { Task } from "@prisma/client";
import { NewProjectDialog } from "@/components/project/NewProjectDialog";

/* ─────────────────────────────── page ─────────────────────────────── */
export default function TeamPage() {
  
  // —— local state —————————————————————————————
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error,   setError]         = useState<string | null>(null);

  // chat-drawer state: {threadId, name}
  const [chatTarget, setChatTarget] = useState<{
    threadId: string;
    name: string;
  } | null>(null);


  
  const myUserId = useAuth().userId; 
  // replace with your auth logic

  /* —— fetch org once ———————————————————————————— */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/team");
        if (!res.ok) throw new Error("Failed to fetch organization");
        const data = await res.json();
        setOrganization(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* —— skeleton / error / empty —————————————————— */
  if (loading) return <Centered text="Loading team data…" />;
  if (error)   return <Centered text={`Error: ${error}`} isError />;
  if (!organization)
    return (
      <Centered>
        <h3 className="text-lg font-semibold mb-2">No Team Found</h3>
        <p className="text-muted-foreground mb-4">
          You're not part of any team yet.
        </p>
        <Link href="/dashboard/team/create">
          <Button>Create a Team</Button>
        </Link>
      </Centered>
    );

  /* —— render page ——————————————————————————————— */
  return (
    <>
      <div className="space-y-6 p-6">
        {/* header */}
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            {organization.name}
          </h1>
          <p className="text-muted-foreground">
            {organization.members.length} members ·{" "}
            {organization.projects.length} projects
          </p>
        </header>

        {/* tabs */}
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <MembersPane
              members={organization.members}
              onOpenChat={async (m) => {
                // 1️⃣ ensure a DM thread exists (call your API)
                const { threadId } = await ensureDmThread(m.id);
                // 2️⃣ open drawer
                setChatTarget({
                  threadId,
                  name: `${m.firstName} ${m.lastName}`,
                });
              }}
              onPing={(m) => console.log("Ping!", m)}
            />
          </TabsContent>

<TabsContent value="projects" className="mt-6">
  <div className="mb-4">
    <NewProjectDialog
      members={organization.members}
      onSuccess={async () => {
  // Quick update: append the new project to local state
  // (returned project comes out of createProject)
  const fresh = await fetch("/api/team").then(r => r.json());
  setOrganization(fresh);
}}

    />
  </div>

  <ProjectsPane
    projects={organization.projects}
    members={organization.members}
  />
</TabsContent>



          <TabsContent value="settings" className="mt-6">
            <ComingSoon icon="⚙️" title="Team Settings" />
          </TabsContent>
        </Tabs>
      </div>

      {/* ——————— chat drawer ——————— */}
      <ChatDrawer
        open={!!chatTarget}
        onOpenChange={() => setChatTarget(null)}
        threadId={chatTarget?.threadId}
        title={chatTarget?.name}
        myUserId={myUserId || ""}
      />
    </>
  );
}


function ProjectsPane({
  projects,
  members,
}: {
  projects: Project[];
  members: Member[];
}) {
  return (
    <div className="space-y-6">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} members={members} />
      ))}
    </div>
  );
}


function ProjectCard({ project, members }: { project: Project; members: Member[] }) {
  const { tasks, isLoading, mutate } = useProjectTasks(project.id);

  return (
    <Link href={`/dashboard/projects/${project.id}`} prefetch={false} className="block">
      <Card className="p-4 space-y-4 hover:shadow cursor-pointer">
        <CardTitle>{project.name}</CardTitle>

        {isLoading ? (
          <Skeleton className="h-4 w-1/3" />
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks yet</p>
        ) : (
          <ul className="space-y-2">
            {tasks.slice(0, 3).map((t:Task) => (  /* show first 3 */
              <li key={t.id} className="flex items-center justify-between">
                <span>{t.name}</span>
                <AssignUserSelect
                  taskId={t.id}
                  projectId={project.id}
                  members={members}
                  currentId={t.userId}
                  onChange={() => mutate()}
                />
              </li>
            ))}
          </ul>
        )}

        {/* optional: quick-add task without leaving the list page */}
        <AddTaskDrawer
  projectId={project.id}
  members={members}

  triggerProps={{ onClick: (e) => e.stopPropagation() }}  // 👈
//                           ^ prevent the Link underneath
/>
      </Card>
    </Link>
  );
}

/* ───────────────────── helper: Members grid ───────────────────── */
function MembersPane({
  members,
  onOpenChat,
  onPing,
}: {
  members: Member[];
  onOpenChat: (m: Member) => void;
  onPing:     (m: Member) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {members.map((m) => (
        <Card key={m.id} className="group relative p-4 hover:shadow-md">
          {/* avatar + name */}
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

          {/* ⋯ dropdown */}
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

      {/* Invite card */}
      <Link href="/dashboard/team/members/invite">
        <Card className="group flex cursor-pointer items-center justify-center border-dashed p-4 text-muted-foreground transition hover:bg-muted">
          + Invite member
        </Card>
      </Link>
    </div>
  );
}

/* ───────────────────── tiny helpers ───────────────────── */
function Centered({
  children,
  text,
  isError,
}: {
  children?: React.ReactNode;
  text?: string;
  isError?: boolean;
}) {
  if (text)
    return (
      <div className="flex items-center justify-center p-8">
        <p className={isError ? "text-red-500" : "text-muted-foreground"}>
          {text}
        </p>
      </div>
    );
  return <div className="flex flex-col items-center justify-center p-8">{children}</div>;
}

function ComingSoon({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm">Feature coming soon!</p>
    </div>
  );
}

/* ───────────────────── mock helper — replace with real call ───────────────────── */
async function ensureDmThread(memberId: string): Promise<{ threadId: string }> {
  // 👉 Replace with your real API call
  const res = await fetch("/api/chat/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body:   JSON.stringify({ memberIds: [memberId] }), // backend figures out uniqueness
  });
  const data = await res.json();
  return { threadId: data.id }; // assuming API returns {id: "..."}
}
