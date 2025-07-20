'use client';

import { useNavigationLoading } from '@/contexts/navigation-loading-context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

export function NavigationLoadingOverlay() {
  const { isNavigating } = useNavigationLoading();

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center',
        'transition-opacity duration-200'
      )}
      role="dialog"
      aria-label="Navigation in progress"
    >
      <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-background border shadow-lg">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
