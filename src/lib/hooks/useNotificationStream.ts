import { useState } from 'react';

interface NotificationEvent {
  type: string;
  data?: any;
  message?: string;
}

/**
 * Real-time notification stream has been disabled to reduce compute costs on Vercel.
 * This hook now returns a stub to prevent breaking existing imports.
 * 
 * To re-enable notifications, consider:
 * 1. Using Vercel Cron Jobs with polling
 * 2. Implementing database-backed notifications
 * 3. Using a third-party service (Pusher, Ably, etc.)
 */
export function useNotificationStream(onNotification: (notification: any) => void) {
  // Always return disconnected state since SSE is disabled
  const [isConnected] = useState(false);

  // No-op: Real-time streaming disabled
  return { isConnected };
}
