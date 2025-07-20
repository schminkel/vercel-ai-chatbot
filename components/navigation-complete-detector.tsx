'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigationLoading } from '@/contexts/navigation-loading-context';

export function NavigationCompleteDetector() {
  const pathname = usePathname();
  const { stopNavigating } = useNavigationLoading();

  useEffect(() => {
    // When the pathname changes, the navigation is complete
    const timer = setTimeout(() => {
      stopNavigating();
    }, 100); // Small delay to ensure the page is fully rendered

    return () => clearTimeout(timer);
  }, [pathname, stopNavigating]);

  return null;
}
