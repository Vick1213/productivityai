/* app/(dashboard)/team/page.tsx */
"use client";

import { useState } from "react";
import useAllOrganisations from "@/lib/hooks/useAllOrganisations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import TeamDashboard from "./TeamDashboard";

export default function TeamRootPage() {
  const { orgs, isLoading, error } = useAllOrganisations();
  const [current, setCurrent] = useState<string | null>(null);

  if (isLoading) return <Center text="Loading organisations…" />;
  if (error)     return <Center text="Error loading organisations" isError />;

  if (current) return <TeamDashboard orgId={current}      onBack={() => setCurrent(null)}   // ← must be here
/>;

  return (
    <div className="mx-auto mt-10 grid w-full max-w-4xl gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {orgs.map((o) => (
        <Card
          key={o.id}
          className="cursor-pointer transition hover:shadow-lg"
          onClick={() => setCurrent(o.id)}
        >
          <CardHeader>
            <CardTitle>{o.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {o.membersCount} member{o.membersCount !== 1 && "s"} ·{" "}
            {o.projectsCount} project{o.projectsCount !== 1 && "s"}
          </CardContent>
        </Card>
      ))}

      <Link href="/dashboard/team/create">
        <Card className="flex cursor-pointer items-center justify-center border-dashed text-muted-foreground transition hover:bg-muted">
          + New organisation
        </Card>
      </Link>
    </div>
  );
}

function Center({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className={isError ? "text-red-500" : "text-muted-foreground"}>
        {text}
      </p>
    </div>
  );
}
