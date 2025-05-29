// app/api/ai/route.ts
// -----------------------------------------------------------------------------
// An experimental AI endpoint that exposes your organisation’s data to OpenAI
// function‑calling so an LLM can create projects, tasks, etc. on demand.
// -----------------------------------------------------------------------------
// ⚠️ This is a toy reference – NEVER let eval run arbitrary text without very
//    strict guards.  Use at your own risk.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers – thin wrappers around Prisma so we can expose them as "tools".
// ─────────────────────────────────────────────────────────────────────────────

const taskTool = {
  /** Create a new task under a project (or inbox if null) */
  async create({
    userId,
    projectId,
    name,
    description = '',
    startsAt,
    dueAt,
  }: {
    userId: string;
    projectId?: string | null;
    name: string;
    description?: string;
    startsAt?: string; // ISO
    dueAt?: string;   // ISO
  }) {
    return prisma.task.create({
      data: {
        userId,
        projectId: projectId ?? undefined,
        name,
        description,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        dueAt: dueAt ? new Date(dueAt) : new Date(),
      },
    });
  },

  /** Return the current user’s projects as a simple tree */
  async projectTree(userId: string) {
    return prisma.project.findMany({
      where: {
        users: {
          some: { id: userId },
        },
      },
      include: {
        tasks: true,
      },
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  OpenAI client + function‑calling schema
// ─────────────────────────────────────────────────────────────────────────────

const { userId } = await auth();


// get user's OpenAI key from database
const user = userId ? await prisma.user.findUnique({
    where: { id: userId },
    select: { openAIKey: true }
}) : null;

// use user's OpenAI key if available
const apiKey = user?.openAIKey;
  

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FUNCTIONS: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
  {
    name: 'create_task',
    description: 'Create a task for the signed‑in user (optionally under a project)',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID of project (omit for inbox)' },
        name: { type: 'string' },
        description: { type: 'string' },
        startsAt: { type: 'string', format: 'date-time' },
        dueAt: { type: 'string', format: 'date-time' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_projects',
    description: 'Return a list of the user’s projects and tasks',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

// Small router mapping fn‑name → implementation
async function callTool(fn: string, args: any, userId: string) {
  switch (fn) {
    case 'create_task':
      return taskTool.create({ userId, ...args });
    case 'list_projects':
      return taskTool.projectTree(userId);
    default:
      throw new Error('Unknown function');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/ai  –  chat with tools
//    • ?q=<prompt>  simple query param for now
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const prompt = req.nextUrl.searchParams.get('q') ?? 'Hello!';

  // 1️⃣ Kick off chat completion with tool definitions
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    functions: FUNCTIONS,
    function_call: 'auto',
  });

  const [choice] = completion.choices;

  // 2️⃣ If LLM wants to call a function, execute it then respond
  if (choice.finish_reason === 'function_call' && choice.message.function_call) {
    const { name, arguments: argStr } = choice.message.function_call;
    const args = JSON.parse(argStr ?? '{}');

    let toolResult;
    try {
      toolResult = await callTool(name, args, userId);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    // 3️⃣ Send the tool response back to the model for a final answer
    const followUp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt },
        choice.message, // function call message
        {
          role: 'function',
          name,
          content: JSON.stringify(toolResult),
        },
      ],
    });

    return NextResponse.json(followUp.choices[0].message);
  }

  // 4️⃣ Otherwise just return the direct answer
  return NextResponse.json(choice.message);
}
