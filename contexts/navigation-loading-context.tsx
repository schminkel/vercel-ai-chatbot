'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  startNavigating: () => void;
  stopNavigating: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | undefined>(undefined);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigating = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const stopNavigating = useCallback(() => {
    setIsNavigating(false);
  }, []);

  return (
    <NavigationLoadingContext.Provider
      value={{
        isNavigating,
        startNavigating,
        stopNavigating,
      }}
    >
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (context === undefined) {
    throw new Error('useNavigationLoading must be used within a NavigationLoadingProvider');
  }
  return context;
}
