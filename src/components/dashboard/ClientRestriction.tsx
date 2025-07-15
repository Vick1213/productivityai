'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ClientRestrictionProps {
  children: React.ReactNode;
}

export function ClientRestriction({ children }: ClientRestrictionProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      // Check if user is a client by making an API call
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.isClient) {
            setIsClient(true);
            
            // Define allowed paths for clients
            const allowedPaths = [
              '/dashboad/campaignreports',
              '/dashboard/ai',
              '/dashboard/analytics',
              '/dashboard/settings',
              '/dashboard/team'
            ];

            // Check if current path is allowed
            const isAllowed = allowedPaths.some(path => pathname.startsWith(path)) || pathname === '/dashboard';
            
            if (!isAllowed) {
              // Redirect to AI page if trying to access restricted content
              router.push('/dashboard/ai');
              return;
            }

            // If on main dashboard, redirect to AI page
            if (pathname === '/dashboard') {
              router.push('/dashboard/ai');
              return;
            }
          } else {
            setIsClient(false);
          }
        })
        .catch(error => {
          console.error('Error checking client status:', error);
          setIsClient(false);
        });
    }
  }, [isLoaded, user, pathname, router]);

  // Show loading while checking client status
  if (!isLoaded || isClient === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
