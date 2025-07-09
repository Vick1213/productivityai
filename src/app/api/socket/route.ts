import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addUserConnection, removeUserConnection } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  // Get user from Clerk auth
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to notification stream'
      })}\n\n`));

      // Store connection
      addUserConnection(userId, controller);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        removeUserConnection(userId, controller);
        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
