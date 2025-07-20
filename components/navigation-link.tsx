'use client';

import Link from 'next/link';
import { type ComponentProps, useCallback, useEffect } from 'react';
import { useNavigationLoading } from '@/contexts/navigation-loading-context';

interface NavigationLinkProps extends ComponentProps<typeof Link> {
  showLoading?: boolean;
}

export function NavigationLink({ 
  href, 
  onClick, 
  showLoading = true, 
  children, 
  ...props 
}: NavigationLinkProps) {
  const { startNavigating, stopNavigating } = useNavigationLoading();

  // Listen for page load completion
  useEffect(() => {
    const handleLoad = () => {
      stopNavigating();
    };

    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [stopNavigating]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (showLoading) {
      startNavigating();
      
      // Fallback timeout in case navigation events don't fire
      setTimeout(() => {
        stopNavigating();
      }, 3000);
    }
    
    // Call the original onClick if provided
    onClick?.(event);
  }, [onClick, showLoading, startNavigating, stopNavigating]);

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
