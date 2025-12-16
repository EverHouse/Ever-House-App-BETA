import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = "", 
  variant = "rectangular", 
  width, 
  height 
}) => {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-white/5";
  
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
      style={{ width, height }}
      role="status"
      aria-label="Loading..."
    />
  );
};

export default Skeleton;