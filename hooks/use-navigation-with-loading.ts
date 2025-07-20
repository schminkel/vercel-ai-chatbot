'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useNavigationLoading } from '@/contexts/navigation-loading-context';

export function useNavigationWithLoading() {
  const router = useRouter();
  const { startNavigating, stopNavigating } = useNavigationLoading();

  // Listen for page load completion
  useEffect(() => {
    const handleLoad = () => {
      stopNavigating();
    };

    const handleBeforeUnload = () => {
      stopNavigating();
    };

    window.addEventListener('load', handleLoad);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stopNavigating]);

  const push = useCallback((href: string, options?: { scroll?: boolean }) => {
    startNavigating();
    
    // Add a small delay to ensure the loading state is visible
    setTimeout(() => {
      router.push(href, options);
    }, 50);
    
    // Fallback timeout in case navigation events don't fire
    const fallbackTimeout = setTimeout(() => {
      stopNavigating();
    }, 3000);

    // Clear the fallback if navigation completes normally
    const cleanup = () => {
      clearTimeout(fallbackTimeout);
    };

    // Store cleanup function for potential cleanup
    (window as any).__navigationCleanup = cleanup;
    
  }, [router, startNavigating, stopNavigating]);

  const replace = useCallback((href: string, options?: { scroll?: boolean }) => {
    startNavigating();
    
    setTimeout(() => {
      router.replace(href, options);
    }, 50);
    
    const fallbackTimeout = setTimeout(() => {
      stopNavigating();
    }, 3000);

    (window as any).__navigationCleanup = () => {
      clearTimeout(fallbackTimeout);
    };
  }, [router, startNavigating, stopNavigating]);

  const refresh = useCallback(() => {
    startNavigating();
    
    setTimeout(() => {
      router.refresh();
    }, 50);
    
    const fallbackTimeout = setTimeout(() => {
      stopNavigating();
    }, 2000);

    (window as any).__navigationCleanup = () => {
      clearTimeout(fallbackTimeout);
    };
  }, [router, startNavigating, stopNavigating]);

  const back = useCallback(() => {
    startNavigating();
    
    setTimeout(() => {
      router.back();
    }, 50);
    
    const fallbackTimeout = setTimeout(() => {
      stopNavigating();
    }, 1500);

    (window as any).__navigationCleanup = () => {
      clearTimeout(fallbackTimeout);
    };
  }, [router, startNavigating, stopNavigating]);

  const forward = useCallback(() => {
    startNavigating();
    
    setTimeout(() => {
      router.forward();
    }, 50);
    
    const fallbackTimeout = setTimeout(() => {
      stopNavigating();
    }, 1500);

    (window as any).__navigationCleanup = () => {
      clearTimeout(fallbackTimeout);
    };
  }, [router, startNavigating, stopNavigating]);

  return {
    push,
    replace,
    refresh,
    back,
    forward,
    // Also expose the original router for cases where loading isn't needed
    router,
  };
}
