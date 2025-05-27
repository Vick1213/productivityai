// app/(dashboard)/calendar/page.tsx

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CalendarPanel } from "@/components/dashboard/calendar";

/**
 * Stand‑alone Calendar page
 * ---------------------------------------------
 * Renders the same calendar used in the sidebar but full‑width, so users can
 * browse tasks by month without the task list.
 */
export default async function CalendarPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const raw = await prisma.task.findMany({
    where: { userId },
    orderBy: { dueDate: "asc" },
  });

  // Convert Date → ISO string so it matches CalendarPanel props
  const tasks = raw.map(({ dueDate, ...rest }) => ({
    ...rest,
    dueDate: dueDate.toISOString(),
  }));

  return (
    <section className="max-w-screen-lg mx-auto p-4 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      <CalendarPanel tasks={tasks} />
    </section>
  );
}

/* ----------------------------------------------------------- */
/*  Routing Notes                                              */
/* ----------------------------------------------------------- */
// 1. Place this file under app/(dashboard)/calendar/page.tsx if your routes are
//    segmented, or directly under app/calendar/page.tsx for a top‑level route.
// 2. The `"use client";` directive lets CalendarPanel manage its own state.
// 3. Styling assumes Tailwind + shadcn; adjust as needed.
