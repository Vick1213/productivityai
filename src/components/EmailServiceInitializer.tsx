"use client";

import { useEffect } from 'react';

export function EmailServiceInitializer() {
  useEffect(() => {
    // Initialize email service on app startup (client-side trigger)
    const initializeEmailService = async () => {
      try {
        const response = await fetch('/api/notifications/email-service', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'start' })
        });
        
        if (response.ok) {
          console.log('✅ Email service initialized successfully');
        } else {
          console.warn('⚠️ Failed to initialize email service');
        }
      } catch (error) {
        console.error('❌ Error initializing email service:', error);
      }
    };

    // Delay initialization to ensure the app is fully loaded
    const timeout = setTimeout(() => {
      initializeEmailService();
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return null;
}
