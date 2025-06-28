import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);   // <-- set in .env

/*────────────────────────────────────────────────────────────────────────────
    /api/team (App-Router)

    • GET   → returns the caller's organisation with members & projects
    • POST  → creates a new organisation, adds the caller as first member,
              then sends a Resend email confirming the creation
────────────────────────────────────────────────────────────────────────────*/

// Helper ────────────────────────────────────────────────────────────────────
const toDTO = (org: NonNullable<any>) => ({
  id: org.id,
  name: org.name,
  createdAt: org.createdAt,
  updatedAt: org.updatedAt,

  members: org.users.map((u: any) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    jobTitle: u.jobTitle,
    role: u.role,
    avatarUrl: u.preferences?.avatarUrl ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  })),

  /* ───── projects now include tasks ───── */
  projects: org.projects.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,

    /* new field: tasks array (full list) */
    tasks: (p.tasks ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      completed: t.completed,
      priority: t.priority,
      dueAt: t.dueAt,
      userId: t.userId,            // needed by AssignUserSelect
    })),
  })),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  /* ── fetch org + members + projects + tasks ───────────────────── */
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        include: {
          users: true,
          projects: {
            include: {
              tasks: {
                orderBy: { dueAt: "asc" },   // nicer default order
                select: {
                  id: true,
                  name: true,
                  completed: true,
                  priority: true,
                  dueAt: true,
                  userId: true,              // needed by AssignUserSelect
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.organization) {
    return NextResponse.json(null);
  }

  /* ensure toDTO doesn’t strip tasks */
  return NextResponse.json(toDTO(user.organization));
}

// POST /api/team ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  // Ensure the user is not already in a team
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (current?.organizationId) {
    return NextResponse.json(
      { error: 'You are already a member of a team' },
      { status: 409 },
    );
  }

  const { name = '' } = (await req.json()) as { name?: string };
  if (!name.trim()) {
    return NextResponse.json(
      { error: 'Organization name is required' },
      { status: 422 },
    );
  }

  try {
    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        users: { connect: { id: userId } },
      },
      include: { users: true, projects: true },
    });

    // Fire-and-forget email (await if you need strict delivery guarantees)
    resend.emails.send({
      from: process.env.FROM_EMAIL!,          // e.g. 'Productivity AI <no-reply@your-app.com>'
      to: current!.email,                    // the creator’s email
      subject: `🎉 You just created “${org.name}”`,
      html: `
        <h2>Welcome to your new team: ${org.name}</h2>
        <p>You’re all set – start inviting team-mates and creating projects.</p>
        <p style="font-size:0.9rem;color:#888">If you didn’t request this, just ignore this message.</p>
      `,
    }).catch((err) => {
      // Don’t block the response if email fails – just log for observability
      console.error('Resend email error:', err);
    });

    return NextResponse.json(toDTO(org), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Unable to create organisation' },
      { status: 500 },
    );
  }
}
