import React, { useState, useRef, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children, 
  className = '',
  threshold = 80 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing) return;
    
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isDragging.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    const dampedDistance = Math.min(distance * 0.5, threshold * 1.5);
    
    if (dampedDistance > 0) {
      e.preventDefault();
      setPullDistance(dampedDistance);
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        touchAction: pullDistance > 0 ? 'none' : 'pan-y',
        overscrollBehaviorY: 'contain'
      }}
    >
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-300 z-50"
        style={{ 
          top: Math.max(-40, pullDistance - 50),
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div 
          className={`w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ 
            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        >
          <span className="material-symbols-outlined text-brand-green text-lg">
            {isRefreshing ? 'progress_activity' : 'arrow_downward'}
          </span>
        </div>
      </div>
      
      <div 
        className="transition-transform duration-300 ease-out"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
