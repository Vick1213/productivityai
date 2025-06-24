'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Organization, Member, Project, Note } from "@/types/team";

/**
 * Tiny fetcher helper so we can use SWR.
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Main Team page – lives at /team (app router)
 *
 * – If the signed‑in user does **not** belong to an organisation, we ask them to create one.
 * – Otherwise we render three tabs: Members ▸ Projects ▸ Notes.
 *
 * Data shape mirrors our Prisma schema but trimmed for the UI layer.
 */
export default function TeamPage() {
  const {
    data: organization,
    isLoading,
    error,
  } = useSWR<Organization | null>("/api/team", fetcher);

  if (isLoading) return <TeamSkeleton />;
  if (error) return <ErrorState message="Could not load team" />;

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          You’re not part of a team yet
        </h1>
        <Link href="/dashboard/team/create">
          <Button>Create a team</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-8">
      {/* ─────────────────────── Header */}
      <header className="space-y-2">
        <h1 className="text-4xl font-bold leading-tight">
          {organization.name}
        </h1>
        <p className="text-muted-foreground">
          {organization.members.length} members · {organization.projects.length} projects
        </p>
      </header>

      {/* ─────────────────────── Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* —— Members —— */}
        <TabsContent value="members">
          <MembersPane members={organization.members} />
        </TabsContent>

        {/* —— Projects —— */}
        <TabsContent value="projects">
          <ProjectsPane projects={organization.projects} />
        </TabsContent>

        {/* —— Notes —— */}
        <TabsContent value="notes">
          <NotesPane notes={organization.notes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Component: Members pane
// ──────────────────────────────────────────────────────────────
function MembersPane({ members }: { members: Member[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {members.map((m) => (
        <Card key={m.id} className="flex items-center gap-4 p-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={m.avatarUrl ?? undefined} alt={m.firstName} />
            <AvatarFallback>
              {m.firstName.charAt(0)}
              {m.lastName.charAt(0)}
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
        </Card>
      ))}
      {/* New member card */}
      <Link href="/team/members/invite">
        <Card className="group flex cursor-pointer items-center justify-center border-dashed p-4 text-muted-foreground transition hover:bg-muted">
          + Invite member
        </Card>
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Component: Projects pane
// ──────────────────────────────────────────────────────────────
function ProjectsPane({ projects }: { projects: Project[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link key={p.id} href={`/projects/${p.id}`}>
          <Card className="group cursor-pointer transition hover:shadow-lg">
            <CardHeader>
              <CardTitle className="truncate text-lg group-hover:underline">
                {p.name}
              </CardTitle>
            </CardHeader>
            {p.description && (
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {p.description}
                </p>
              </CardContent>
            )}
          </Card>
        </Link>
      ))}

      {/* New project card */}
      <Link href="/projects/create">
        <Card className="group flex cursor-pointer items-center justify-center border-dashed p-4 text-muted-foreground transition hover:bg-muted">
          + New project
        </Card>
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Component: Notes pane
// ──────────────────────────────────────────────────────────────
function NotesPane({ notes = [] }: { notes?: Note[] }) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-muted-foreground">No notes yet</p>
        <Link href="/notes/create">
          <Button>New note</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <Card className="group cursor-pointer transition hover:ring-1 hover:ring-primary/40">
            <CardHeader>
              <CardTitle className="group-hover:underline">
                {note.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                {note.body}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
      <Link href="/notes/create">
        <Button>New note</Button>
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Skeleton + Error UI helpers
// ──────────────────────────────────────────────────────────────
function TeamSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-8">
      <Skeleton className="h-10 w-1/3 rounded-lg" />
      <Skeleton className="h-4 w-1/4 rounded" />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <p className="text-muted-foreground">{message}</p>
      <Button
        variant="outline"
        onClick={() => window.location.reload()}
        className="w-fit"
      >
        Retry
      </Button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Utility: simple classnames helper (optional)
// ──────────────────────────────────────────────────────────────
function clsx(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
