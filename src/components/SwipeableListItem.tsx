import { useState, useRef, useCallback, type ReactNode } from 'react';
import { haptic } from '../utils/haptics';

interface SwipeAction {
  id: string;
  icon: string;
  label: string;
  color: 'red' | 'green' | 'blue' | 'orange' | 'gray';
  onClick: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  disabled?: boolean;
  threshold?: number;
}

const colorClasses = {
  red: 'bg-red-500 text-white',
  green: 'bg-green-500 text-white',
  blue: 'bg-blue-500 text-white',
  orange: 'bg-orange-500 text-white',
  gray: 'bg-gray-500 text-white'
};

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeStart,
  onSwipeEnd,
  disabled = false,
  threshold = 80
}: SwipeableListItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const directionLockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  const actionWidth = threshold;
  const maxLeftSwipe = leftActions.length > 0 ? actionWidth * leftActions.length : 0;
  const maxRightSwipe = rightActions.length > 0 ? actionWidth * rightActions.length : 0;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isSwipingRef.current = false;
    directionLockedRef.current = null;
    setIsTransitioning(false);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    if (directionLockedRef.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        directionLockedRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
        if (directionLockedRef.current === 'horizontal') {
          isSwipingRef.current = true;
          onSwipeStart?.();
          haptic.selection();
        }
      }
    }

    if (directionLockedRef.current === 'horizontal') {
      let newTranslateX = deltaX;
      
      if (deltaX > 0 && leftActions.length === 0) {
        newTranslateX = deltaX * 0.2;
      } else if (deltaX < 0 && rightActions.length === 0) {
        newTranslateX = deltaX * 0.2;
      } else if (deltaX > maxLeftSwipe) {
        newTranslateX = maxLeftSwipe + (deltaX - maxLeftSwipe) * 0.2;
      } else if (deltaX < -maxRightSwipe) {
        newTranslateX = -maxRightSwipe + (deltaX + maxRightSwipe) * 0.2;
      }

      setTranslateX(newTranslateX);
    }
  }, [disabled, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe, onSwipeStart]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isSwipingRef.current) return;
    
    setIsTransitioning(true);
    
    if (translateX > threshold && leftActions.length > 0) {
      setTranslateX(maxLeftSwipe);
      haptic.light();
    } else if (translateX < -threshold && rightActions.length > 0) {
      setTranslateX(-maxRightSwipe);
      haptic.light();
    } else {
      setTranslateX(0);
    }

    onSwipeEnd?.();
    isSwipingRef.current = false;
  }, [disabled, translateX, threshold, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe, onSwipeEnd]);

  const handleActionClick = (action: SwipeAction) => {
    haptic.medium();
    action.onClick();
    setIsTransitioning(true);
    setTranslateX(0);
  };

  const close = useCallback(() => {
    setIsTransitioning(true);
    setTranslateX(0);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {leftActions.length > 0 && (
        <div 
          className="absolute inset-y-0 left-0 flex"
          style={{ width: maxLeftSwipe }}
        >
          {leftActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`flex flex-col items-center justify-center gap-1 ${colorClasses[action.color]} tap-target`}
              style={{ width: actionWidth }}
              aria-label={action.label}
            >
              <span className="material-symbols-outlined text-xl">{action.icon}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {rightActions.length > 0 && (
        <div 
          className="absolute inset-y-0 right-0 flex"
          style={{ width: maxRightSwipe }}
        >
          {rightActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`flex flex-col items-center justify-center gap-1 ${colorClasses[action.color]} tap-target`}
              style={{ width: actionWidth }}
              aria-label={action.label}
            >
              <span className="material-symbols-outlined text-xl">{action.icon}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={`relative bg-bone dark:bg-[#1a1f12] ${isTransitioning ? 'transition-transform duration-200 ease-out' : ''}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={translateX !== 0 ? close : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableListItem;
