/* app/api/tasks/[id]/route.ts */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

/* ───────── GET /api/tasks/:id ───────── */
export async function GET(req: Request, { params }: any) {
  const taskId = params.id;          // ← safe, params is inferred

  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: {
      project:  { select: { id: true, name: true } },
      tags:     { select: { id: true, name: true } },
      subtasks: { select: { id: true, name: true, completed: true } },
    },
  });

  if (!task)
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  return NextResponse.json(task);
}

/* ───────── PATCH /api/tasks/:id ───────── */
export async function PATCH(req: Request, { params }: any) {
  const taskId = params.id;
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const exists = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!exists)
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const data = await req.json();
  const updated = await prisma.task.update({
    where: { id: taskId },
    data:  { ...data, updatedAt: new Date() },
    include: {
      project:  { select: { id: true, name: true } },
      tags:     { select: { id: true, name: true } },
      subtasks: { select: { id: true, name: true, completed: true } },
    },
  });
  return NextResponse.json(updated);
}

/* ───────── DELETE /api/tasks/:id ───────── */
export async function DELETE(_req: Request, { params }: any) {
  const taskId = params.id;
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const exists = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!exists)
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  await prisma.task.delete({ where: { id: taskId } });
  return NextResponse.json({ message: 'Task deleted successfully' });
}
