// Real-time SSE notifications have been disabled to reduce compute costs on Vercel.
// These are stub functions to prevent breaking existing imports.

// Stub function - notifications are no longer broadcast in real-time
export function broadcastToUser(userId: string, notification: any) {
  // No-op: Real-time broadcasting disabled
  // Consider implementing database-backed notifications that can be polled
  console.log(`Notification for user ${userId}:`, notification);
}

// Stub functions for backward compatibility
export function addUserConnection(userId: string, controller: any) {
  // No-op: SSE connections disabled
}

export function removeUserConnection(userId: string, controller: any) {
  // No-op: SSE connections disabled
}

// Empty map for backward compatibility
export const userConnections = new Map<string, Set<any>>();
