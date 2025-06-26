// app/api/ai/route.ts
// -----------------------------------------------------------------------------
//  (imports stay exactly the same)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION DEFINITIONS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const FUNCTIONS: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
  /* … same as before … */
];

// Small router to call our tools
async function callTool(fn: string, args: any, userId: string) {
  /* … unchanged … */
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/ai
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // 1️⃣  Auth *inside* the request scope
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  // 2️⃣  Look up the user’s personal OpenAI key (optional)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { openAIKey: true },
  });

  // 3️⃣  Create the OpenAI client for *this* request
  const openai = new OpenAI({
    apiKey: dbUser?.openAIKey || process.env.OPENAI_API_KEY,
  });

  // 4️⃣  Read the prompt
  const prompt = req.nextUrl.searchParams.get('q') ?? 'Hello!';

  // 5️⃣  First completion with tool defs
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    functions: FUNCTIONS,
    function_call: 'auto',
  });

  const [choice] = completion.choices;

  // 6️⃣  If the model wants to call a function → execute → follow-up
  if (choice.finish_reason === 'function_call' && choice.message.function_call) {
    const { name, arguments: argStr } = choice.message.function_call;
    const args = JSON.parse(argStr ?? '{}');

    let toolResult;
    try {
      toolResult = await callTool(name, args, userId);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    const followUp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt },
        choice.message,
        { role: 'function', name, content: JSON.stringify(toolResult) },
      ],
    });

    return NextResponse.json(followUp.choices[0].message);
  }

  // 7️⃣  Plain answer
  return NextResponse.json(choice.message);
}
