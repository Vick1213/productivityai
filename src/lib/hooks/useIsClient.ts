'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export function useIsClient() {
  const { user, isLoaded } = useUser();
  const [isClient, setIsClient] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          setIsClient(data.isClient || false);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error checking client status:', error);
          setIsClient(false);
          setLoading(false);
        });
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, user]);

  return { isClient, loading };
}
