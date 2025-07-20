'use client';

import { useNavigationLoading } from '@/contexts/navigation-loading-context';
import { useCallback } from 'react';

export function useLoadingAction() {
  const { startNavigating, stopNavigating } = useNavigationLoading();

  const executeWithLoading = useCallback(async <T>(
    action: () => Promise<T> | T,
    options?: {
      minDuration?: number;
      maxDuration?: number;
    }
  ): Promise<T> => {
    const { minDuration = 200, maxDuration = 5000 } = options || {};
    
    startNavigating();
    
    const startTime = Date.now();
    
    try {
      const result = await Promise.resolve(action());
      
      const elapsed = Date.now() - startTime;
      const remainingMinTime = Math.max(0, minDuration - elapsed);
      
      // Ensure minimum loading time for better UX
      if (remainingMinTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingMinTime));
      }
      
      return result;
    } finally {
      // Safety timeout
      setTimeout(() => {
        stopNavigating();
      }, Math.max(0, maxDuration - (Date.now() - startTime)));
      
      stopNavigating();
    }
  }, [startNavigating, stopNavigating]);

  return { executeWithLoading };
}
