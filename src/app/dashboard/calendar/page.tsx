'use server';

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CalendarPanel } from '@/components/dashboard/calendar';
import { Priority } from '@prisma/client';

// Shape expected by <CalendarPanel>
interface CalendarTask {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  completed: boolean;
  // legacy props consumed by CalendarPanel
  date: string;   // ISO date portion (yyyy-mm-dd)
  time: string;   // ISO time portion or full ISO if component trims
  dueDate: string; // full ISO (compat)
  // new props
  startsAt: string; // ISO
  dueAt: string;   // ISO
}

export default async function CalendarPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // grab all tasks belonging to the user, ordered by the new dueAt field
  const raw = await prisma.task.findMany({
    where: { userId },
    orderBy: { dueAt: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      priority: true,
      completed: true,
      startsAt: true,
      dueAt: true,
    },
  });

  const tasks: CalendarTask[] = raw.map((t) => {
    const startsISO = t.startsAt.toISOString();
    const dueISO = t.dueAt.toISOString();

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      priority: t.priority,
      completed: t.completed,
      // legacy keys
      date: dueISO.split('T')[0],
      time: startsISO,
      dueDate: dueISO,
      // new keys
      startsAt: startsISO,
      dueAt: dueISO,
    };
  });

  return (
    <section className="mx-auto max-w-screen-lg p-4 lg:p-8">
      <h1 className="mb-6 text-2xl font-bold">Calendar</h1>
      <CalendarPanel tasks={tasks as any} />
    </section>
  );
}
