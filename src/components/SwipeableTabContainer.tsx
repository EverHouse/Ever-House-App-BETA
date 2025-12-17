import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHaptic } from '../utils/haptics';
import { TABS } from './BottomTabBar';

interface SwipeableTabContainerProps {
  children: React.ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

const SwipeableTabContainer: React.FC<SwipeableTabContainerProps> = ({
  children,
  activeIndex,
  onIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState<boolean | null>(null);

  const SWIPE_THRESHOLD = 80;
  const VELOCITY_THRESHOLD = 0.3;
  const lastTouchX = useRef(0);
  const lastTouchTime = useRef(0);
  const velocity = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setIsHorizontalSwipe(null);
    lastTouchX.current = touch.clientX;
    lastTouchTime.current = Date.now();
    velocity.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (isHorizontalSwipe === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        setIsHorizontalSwipe(isHorizontal);
        if (!isHorizontal) {
          setTouchStartX(null);
          setTouchStartY(null);
          return;
        }
      } else {
        return;
      }
    }

    if (!isHorizontalSwipe) return;

    e.preventDefault();

    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) {
      velocity.current = (touch.clientX - lastTouchX.current) / dt;
    }
    lastTouchX.current = touch.clientX;
    lastTouchTime.current = now;

    const canSwipeLeft = activeIndex < children.length - 1;
    const canSwipeRight = activeIndex > 0;

    let clampedOffset = deltaX;
    if (deltaX < 0 && !canSwipeLeft) {
      clampedOffset = deltaX * 0.2;
    } else if (deltaX > 0 && !canSwipeRight) {
      clampedOffset = deltaX * 0.2;
    }

    setDragOffset(clampedOffset);
    setIsDragging(true);
  }, [touchStartX, touchStartY, isHorizontalSwipe, activeIndex, children.length]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) {
      setTouchStartX(null);
      setTouchStartY(null);
      setIsHorizontalSwipe(null);
      return;
    }

    const shouldSwipe = Math.abs(dragOffset) > SWIPE_THRESHOLD || Math.abs(velocity.current) > VELOCITY_THRESHOLD;
    
    if (shouldSwipe) {
      if (dragOffset < 0 && activeIndex < children.length - 1) {
        triggerHaptic('light');
        onIndexChange(activeIndex + 1);
      } else if (dragOffset > 0 && activeIndex > 0) {
        triggerHaptic('light');
        onIndexChange(activeIndex - 1);
      }
    }

    setDragOffset(0);
    setIsDragging(false);
    setTouchStartX(null);
    setTouchStartY(null);
    setIsHorizontalSwipe(null);
  }, [isDragging, dragOffset, activeIndex, children.length, onIndexChange]);

  const containerWidth = containerRef.current?.offsetWidth || (typeof window !== 'undefined' ? window.innerWidth : 400);
  const translateX = -activeIndex * containerWidth + dragOffset;

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          width: `${children.length * 100}%`,
        }}
      >
        {React.Children.map(children, (child, index) => (
          <div
            key={index}
            className="h-full overflow-y-auto overflow-x-hidden"
            style={{ 
              width: `${100 / children.length}%`,
              flexShrink: 0,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SwipeableTabContainer;
