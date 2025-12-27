import React from 'react';
import WalkingGolferSpinner from './WalkingGolferSpinner';

interface LoadingStateProps {
  message?: string;
  variant?: 'default' | 'compact' | 'inline';
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  variant = 'default'
}) => {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-primary/60 dark:text-white/60">
        <WalkingGolferSpinner size="sm" />
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div className={`flex flex-col items-center justify-center text-center ${isCompact ? 'py-8 px-4' : 'py-16 px-6'} animate-pop-in`}>
      <div className={`relative ${isCompact ? 'mb-3' : 'mb-6'}`}>
        <WalkingGolferSpinner size={isCompact ? 'md' : 'lg'} />
      </div>

      <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-primary/60 dark:text-white/60`}>
        {message}
      </p>
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3,
  className = ''
}) => (
  <div className={`space-y-3 animate-pulse ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className="h-4 bg-gray-200 dark:bg-white/10 rounded"
        style={{ width: `${100 - (i * 15)}%` }}
      />
    ))}
  </div>
);

export const LoadingCard: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-surface-dark rounded-2xl p-5 border border-gray-100 dark:border-white/5 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default LoadingState;
