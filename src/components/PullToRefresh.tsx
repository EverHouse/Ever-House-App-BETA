import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const taglines = [
  "Your second home.",
  "Rooted in golf, built for community.",
  "Where design meets lifestyle.",
  "Elevate your everyday experience.",
  "Come in, settle down, stay awhile.",
  "A place to focus, meet, and connect.",
  "Step onto the green.",
  "Golf all year.",
  "Where every day feels like a day on the course.",
  "Practice with purpose.",
  "Tour-level data, right here at home.",
  "Inspire. Engage. Elevate.",
  "Effortless balance.",
  "Play through.",
  "Refined leisure.",
  "Always open.",
  "A welcoming community.",
  "More than a sport.",
  "Productivity meets leisure."
];

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 160;
const HEADER_HEIGHT = 72;

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh, disabled = false, className = '' }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFillingScreen, setIsFillingScreen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [tagline] = useState(() => taglines[Math.floor(Math.random() * taglines.length)]);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWheelPullingRef = useRef(false);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing || isFillingScreen) return;
    
    wheelAccumulatorRef.current = 0;
    isWheelPullingRef.current = false;
    setIsFillingScreen(true);
    setPullDistance(0);
    
    await new Promise(resolve => setTimeout(resolve, 350));
    
    setIsFillingScreen(false);
    setIsRefreshing(true);
    
    try {
      await onRefresh();
    } catch (e) {
      console.error('Refresh failed:', e);
    }
    
    setIsExiting(true);
    await new Promise(resolve => setTimeout(resolve, 550));
    setIsRefreshing(false);
    setIsExiting(false);
  }, [isRefreshing, isFillingScreen, onRefresh]);

  // Desktop scroll wheel support
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (disabled || isRefreshing || isFillingScreen) return;
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      // Only activate when at top of page and scrolling up
      if (scrollTop <= 5 && e.deltaY < 0) {
        // Accumulate upward scroll
        wheelAccumulatorRef.current += Math.abs(e.deltaY) * 0.3;
        wheelAccumulatorRef.current = Math.min(wheelAccumulatorRef.current, MAX_PULL);
        isWheelPullingRef.current = true;
        
        setPullDistance(wheelAccumulatorRef.current);
        
        // Reset accumulator after a pause in scrolling
        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
        }
        wheelTimeoutRef.current = setTimeout(() => {
          if (wheelAccumulatorRef.current >= PULL_THRESHOLD && !isRefreshing && !isFillingScreen) {
            triggerRefresh();
          } else {
            wheelAccumulatorRef.current = 0;
            isWheelPullingRef.current = false;
            setPullDistance(0);
          }
        }, 150);
      } else if (scrollTop > 5 || e.deltaY > 0) {
        // Reset if scrolled away from top or scrolling down
        wheelAccumulatorRef.current = 0;
        isWheelPullingRef.current = false;
        setPullDistance(0);
      }
    };
    
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [disabled, isRefreshing, isFillingScreen, triggerRefresh]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 5) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || startYRef.current === null || disabled || isRefreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(distance);
      
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;
    
    isPullingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing && !isFillingScreen) {
      setIsFillingScreen(true);
      setPullDistance(0);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      setIsFillingScreen(false);
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (e) {
        console.error('Refresh failed:', e);
      }
      
      setIsExiting(true);
      await new Promise(resolve => setTimeout(resolve, 550));
      setIsRefreshing(false);
      setIsExiting(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, isFillingScreen, onRefresh, disabled]);

  useEffect(() => {
    if (isRefreshing || isFillingScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isRefreshing, isFillingScreen]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showPullBar = pullDistance > 5 && !isRefreshing && !isFillingScreen;
  const barHeight = HEADER_HEIGHT + pullDistance;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`min-h-full ${className}`}
      style={{ touchAction: pullDistance > 0 ? 'none' : 'pan-y' }}
    >
      {showPullBar && createPortal(
        <div 
          className="ptr-pull-bar"
          style={{ 
            height: `${barHeight}px`,
            paddingTop: 'env(safe-area-inset-top, 0px)'
          }}
        >
          <div 
            className="ptr-pull-content"
            style={{
              opacity: pullProgress,
              transform: `scale(${0.7 + pullProgress * 0.3})`
            }}
          >
            <img 
              src="/assets/logos/walking-mascot-white.gif" 
              alt="" 
              className="ptr-pull-mascot"
            />
            {pullProgress >= 1 && (
              <span className="ptr-release-text">Release to refresh</span>
            )}
          </div>

          <style>{`
            .ptr-pull-bar {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              background-color: #293515;
              z-index: 9999;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding-bottom: 12px;
              border-radius: 0 0 20px 20px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              will-change: height;
            }

            .ptr-pull-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 6px;
              will-change: opacity, transform;
            }

            .ptr-pull-mascot {
              width: 56px;
              height: 56px;
              object-fit: contain;
            }

            .ptr-release-text {
              font-family: 'Inter', sans-serif;
              font-size: 12px;
              font-weight: 500;
              color: rgba(255,255,255,0.9);
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          `}</style>
        </div>,
        document.body
      )}

      {isFillingScreen && createPortal(
        <div className="ptr-fill-overlay">
          <style>{`
            .ptr-fill-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #293515;
              z-index: 99999;
              animation: ptrFillScreen 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            @keyframes ptrFillScreen {
              0% {
                clip-path: inset(0 0 100% 0);
              }
              100% {
                clip-path: inset(0 0 0 0);
              }
            }
          `}</style>
        </div>,
        document.body
      )}

      {isRefreshing && createPortal(
        <div className={`ptr-loader-overlay ${isExiting ? 'ptr-loader-exit' : ''}`}>
          <div className={`ptr-loader-content ${isExiting ? 'ptr-content-exit' : ''}`}>
            <div className="ptr-mascot">
              <img 
                src="/assets/logos/walking-mascot-white.gif" 
                alt="Refreshing..." 
                className="ptr-mascot-image"
              />
            </div>
            <p className="ptr-tagline">{tagline}</p>
          </div>

          <style>{`
            .ptr-loader-overlay {
              position: fixed;
              inset: 0;
              z-index: 99999;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #293515;
              will-change: transform;
            }

            .ptr-loader-exit {
              animation: ptrSlideUp 0.55s cubic-bezier(0.32, 0, 0.67, 0) forwards;
              pointer-events: none;
            }

            @keyframes ptrSlideUp {
              0% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(-100%);
              }
            }

            .ptr-loader-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1.5rem;
              will-change: opacity, transform;
              animation: ptrContentFadeIn 0.3s ease-out forwards;
            }

            @keyframes ptrContentFadeIn {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }

            .ptr-content-exit {
              animation: ptrContentFadeOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
            }

            @keyframes ptrContentFadeOut {
              0% {
                opacity: 1;
                transform: translateY(0);
              }
              100% {
                opacity: 0;
                transform: translateY(-30px);
              }
            }

            .ptr-mascot-image {
              width: 120px;
              height: auto;
            }

            .ptr-tagline {
              font-family: 'Playfair Display', serif;
              color: white;
              font-size: 1rem;
              text-align: center;
              margin: 0;
              padding: 0 2rem;
            }

            .ptr-mascot {
              display: flex;
              justify-content: center;
              align-items: center;
            }
          `}</style>
        </div>,
        document.body
      )}

      {children}
    </div>
  );
};

export default PullToRefresh;
