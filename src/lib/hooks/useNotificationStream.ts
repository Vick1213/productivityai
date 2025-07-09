import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface NotificationEvent {
  type: string;
  data?: any;
  message?: string;
}

export function useNotificationStream(onNotification: (notification: any) => void) {
  const { userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new SSE connection
    const eventSource = new EventSource('/api/socket');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('Notification stream connected');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: NotificationEvent = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Connected to notification stream');
        } else if (data.type === 'notification' && data.data) {
          onNotification(data.data);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (userId && eventSourceRef.current?.readyState === EventSource.CLOSED) {
          // Reconnection logic would go here if needed
        }
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [userId, onNotification]);

  return { isConnected };
}
