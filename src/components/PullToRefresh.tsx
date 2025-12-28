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
const MAX_PULL = 140;

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh, disabled = false, className = '' }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [tagline] = useState(() => taglines[Math.floor(Math.random() * taglines.length)]);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

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
      const resistance = 0.4;
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

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      
      try {
        await onRefresh();
      } finally {
        setIsExiting(true);
        setTimeout(() => {
          setIsRefreshing(false);
          setIsExiting(false);
        }, 700);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh, disabled]);

  useEffect(() => {
    if (isRefreshing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isRefreshing]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showIndicator = pullDistance > 10 && !isRefreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`min-h-full ${className}`}
      style={{ touchAction: pullDistance > 0 ? 'none' : 'pan-y' }}
    >
      {showIndicator && (
        <div 
          className="fixed left-0 right-0 flex flex-col items-center pointer-events-none z-[9998]"
          style={{ 
            top: `calc(env(safe-area-inset-top, 0px) + 80px)`,
            opacity: pullProgress,
            transform: `translateY(${pullDistance - 40}px) scale(${0.6 + pullProgress * 0.4})`
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#293515] flex items-center justify-center shadow-lg border-2 border-white/20">
            <img 
              src="/assets/logos/mascot-white.webp" 
              alt="" 
              className="w-10 h-10 object-contain"
              style={{ 
                transform: `rotate(${pullProgress * 360}deg)`,
                transition: 'transform 0.1s ease-out'
              }}
            />
          </div>
          {pullProgress >= 1 && (
            <div className="mt-2 text-xs text-[#293515] dark:text-white font-medium bg-white/80 dark:bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Release to refresh
            </div>
          )}
        </div>
      )}

      {isRefreshing && createPortal(
        <div className={`ptr-loader-overlay ${isExiting ? 'ptr-loader-exit' : ''}`}>
          <div className={`ptr-loader-content ${isExiting ? 'ptr-content-exit' : ''}`}>
            <div className="ptr-mascot-walk">
              <img 
                src="/assets/logos/mascot-white.webp" 
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
              will-change: clip-path;
            }

            .ptr-loader-exit {
              animation: ptrMinimizeToStatusBar 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
              pointer-events: none;
            }

            @keyframes ptrMinimizeToStatusBar {
              0% {
                clip-path: inset(0 0 0 0);
              }
              30% {
                clip-path: inset(0 0 40% 0);
              }
              60% {
                clip-path: inset(0 0 75% 0);
              }
              100% {
                clip-path: inset(0 0 calc(100% - env(safe-area-inset-top, 44px)) 0);
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
              animation: ptrContentFadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            @keyframes ptrContentFadeOut {
              0% {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
              50% {
                opacity: 0.3;
                transform: scale(0.9) translateY(-20px);
              }
              100% {
                opacity: 0;
                transform: scale(0.7) translateY(-50px);
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

            .ptr-mascot-walk {
              animation: ptrWalk 0.6s ease-in-out infinite;
            }

            @keyframes ptrWalk {
              0%, 100% { 
                transform: translateY(0) rotate(-2deg); 
              }
              25% {
                transform: translateY(-8px) rotate(0deg);
              }
              50% { 
                transform: translateY(0) rotate(2deg); 
              }
              75% {
                transform: translateY(-8px) rotate(0deg);
              }
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
