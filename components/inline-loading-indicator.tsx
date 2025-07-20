'use client';

import { useNavigationLoading } from '@/contexts/navigation-loading-context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

interface InlineLoadingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function InlineLoadingIndicator({ 
  className, 
  size = 'sm', 
  text = 'Loading...' 
}: InlineLoadingIndicatorProps) {
  const { isNavigating } = useNavigationLoading();

  if (!isNavigating) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size={size} />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}
