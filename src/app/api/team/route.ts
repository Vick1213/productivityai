import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

/*
────────────────────────────────────────────────────────────────────────────
    /api/team (App‑Router)

    • GET   → returns the caller's organisation with members, projects & notes
    • POST  → creates a new organisation and adds the caller as its first member
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
    projects: org.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    })),
});

// GET /api/team ────────────────────────────────────────────────────────────
export async function GET(_: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            organization: {
                include: {
                    users: true,
                    projects: true,
                },
            },
        },
    });

    if (!user || !user.organization) {
        // Returning null makes the client show the "Create a team" UI.
        return NextResponse.json(null);
    }

    return NextResponse.json(toDTO(user.organization));
}

// POST /api/team ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const { userId } =  await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // Ensure the user is not already in a team.
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (current?.organizationId) {
        return NextResponse.json(
            { error: 'You are already a member of a team' },
            { status: 409 },
        );
    }

    const body = (await req.json()) as { name?: string };
    if (!body.name || !body.name.trim()) {
        return NextResponse.json(
            { error: 'Organization name is required' },
            { status: 422 },
        );
    }

    const org = await prisma.organization.create({
        data: {
            name: body.name.trim(),
            users: {
                connect: { id: userId },
            },
        },
        include: {
            users: true,
            projects: true,
        },
    });

    return NextResponse.json(toDTO(org), { status: 201 });
}
