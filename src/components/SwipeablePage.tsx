
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface SwipeablePageProps {
  children: React.ReactNode;
  className?: string;
}

const SwipeablePage: React.FC<SwipeablePageProps> = ({ children, className = "" }) => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  // Constants
  const SWIPE_THRESHOLD = 120; // px to trigger back
  const [screenHalf, setScreenHalf] = useState(() => typeof window !== 'undefined' ? window.innerWidth / 2 : 200);

  useEffect(() => {
    const handleResize = () => setScreenHalf(window.innerWidth / 2);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Swipe-to-go-back disabled for simpler UX
    return;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart;
    
    // Prevent scrolling left (negative translate)
    if (diff > 0) {
      setTouchX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping || touchX === null) {
        setIsSwiping(false);
        setTouchStart(null);
        setTouchX(null);
        return;
    }

    if (touchX > SWIPE_THRESHOLD) {
      // Trigger back navigation
      setAnimatingOut(true);
      setTimeout(() => {
        navigate(-1);
      }, 300); // Match animation duration
    } else {
      // Snap back
      setTouchX(0);
    }

    setIsSwiping(false);
    setTouchStart(null);
    // Note: we keep touchX for a moment to allow React to render the snap back if not navigating
    if (touchX <= SWIPE_THRESHOLD) {
        setTimeout(() => setTouchX(null), 200);
    }
  };

  // Calculate dynamic style for the swipe effect
  const style: React.CSSProperties = {
    transform: touchX !== null ? `translateX(${touchX}px)` : undefined,
    transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
  };

  return (
    <div 
        ref={containerRef}
        className={`
            w-full min-h-full ${isDark ? 'bg-[#0f120a]' : 'bg-[#F2F2EC]'} relative
            ${animatingOut ? 'animate-slide-out-right' : 'animate-slide-in-right'}
            ${className}
        `}
        style={style}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
        {/* Shadow Overlay to give depth during swipe */}
        <div 
            className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent -ml-4 pointer-events-none"
            style={{ opacity: touchX ? Math.min(touchX / 100, 1) : 0 }}
        ></div>
        
        {children}
    </div>
  );
};

export default SwipeablePage;