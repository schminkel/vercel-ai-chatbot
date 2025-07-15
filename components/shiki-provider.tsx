'use client';

import { useEffect } from 'react';
import { disposeShikiHighlighter } from '@/lib/shiki-highlighter';

/**
 * Component that handles Shiki highlighter cleanup on app unmount
 */
export function ShikiProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Cleanup function to dispose highlighter when component unmounts
    return () => {
      disposeShikiHighlighter();
    };
  }, []);

  return <>{children}</>;
}
