"use client";

import { useEffect } from 'react';

export function NotificationServiceInitializer() {
  useEffect(() => {
    // Initialize the notification service when the app loads
    fetch('/api/notifications/service')
      .then(response => response.json())
      .then(data => console.log('Notification service:', data.message))
      .catch(error => console.error('Failed to initialize notification service:', error));
  }, []);

  return null; // This component doesn't render anything
}
