// Store SSE connections by user ID
const userConnections = new Map<string, Set<ReadableStreamDefaultController>>();

// Function to broadcast notification to user via SSE
export function broadcastToUser(userId: string, notification: any) {
  const connections = userConnections.get(userId);
  if (connections) {
    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify({
      type: 'notification',
      data: notification
    })}\n\n`;
    
    connections.forEach((controller) => {
      try {
        controller.enqueue(encoder.encode(message));
      } catch (error) {
        console.error('Error sending SSE message:', error);
        // Remove broken connection
        connections.delete(controller);
      }
    });
  }
}

// Function to add user connection
export function addUserConnection(userId: string, controller: ReadableStreamDefaultController) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(controller);
}

// Function to remove user connection
export function removeUserConnection(userId: string, controller: ReadableStreamDefaultController) {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.delete(controller);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
}

export { userConnections };
