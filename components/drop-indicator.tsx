'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropIndicatorProps {
  isVisible: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const DropIndicator = ({ 
  isVisible, 
  orientation = 'horizontal',
  className 
}: DropIndicatorProps) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-primary rounded-full',
        orientation === 'horizontal' 
          ? 'h-0.5 w-full' 
          : 'w-0.5 h-full',
        className
      )}
    >
      <div 
        className={cn(
          'bg-primary rounded-full animate-pulse',
          orientation === 'horizontal' 
            ? 'h-full w-full' 
            : 'w-full h-full'
        )} 
      />
    </motion.div>
  );
};
