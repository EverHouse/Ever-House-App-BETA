import React, { useRef, useEffect, useCallback } from 'react';
import { useBottomNav } from '../../contexts/BottomNavContext';

export const BottomSentinel: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { setIsAtBottom } = useBottomNav();
  const lastScrollY = useRef(0);
  const isHiddenRef = useRef(false);
  const SCROLL_THRESHOLD = 50;
  
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    
    const isScrollable = scrollHeight > clientHeight + 100;
    const scrollDelta = currentScrollY - lastScrollY.current;
    
    if (isScrollable) {
      if (scrollDelta > 5 && currentScrollY > SCROLL_THRESHOLD) {
        isHiddenRef.current = true;
      } else if (scrollDelta < -5) {
        isHiddenRef.current = false;
      }
    } else {
      isHiddenRef.current = false;
    }
    
    lastScrollY.current = currentScrollY;
    setIsAtBottom(isHiddenRef.current);
  }, [setIsAtBottom]);
  
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      setIsAtBottom(false);
    };
  }, [handleScroll, setIsAtBottom]);
  
  return <div ref={sentinelRef} className="h-24 w-full pointer-events-none" aria-hidden="true" />;
};
