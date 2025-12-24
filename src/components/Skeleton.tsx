import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'lines' | 'card' | 'circle';
  width?: string | number;
  height?: string | number;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = "", 
  variant = "rectangular", 
  width, 
  height,
  count = 1
}) => {
  const baseClasses = "animate-pulse bg-white/10";
  
  const variantClasses: Record<string, string> = {
    text: "rounded h-4",
    circular: "rounded-full",
    circle: "rounded-full",
    rectangular: "rounded-xl",
    lines: "rounded",
    card: "rounded-xl",
  };

  if (variant === 'lines') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div 
            key={i}
            className={`${baseClasses} rounded h-4`}
            style={{ width: i === count - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} rounded-xl p-4 ${className}`} style={{ width, height }}>
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (count > 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div 
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{ width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
      style={{ width, height }}
      role="status"
      aria-label="Loading..."
    />
  );
};

interface SkeletonFadeProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

export const SkeletonFade: React.FC<SkeletonFadeProps> = ({ loading, skeleton, children }) => {
  return (
    <div className="relative">
      <div className={`transition-opacity duration-300 ${loading ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
        {skeleton}
      </div>
      <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ isDark?: boolean }> = () => (
  <div className="bg-white/5 rounded-xl p-4 animate-pulse">
    <div className="flex gap-3">
      <div className="w-12 h-12 rounded-lg bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
