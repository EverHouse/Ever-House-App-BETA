import React, { useRef, useEffect, useCallback } from 'react';
import { useBottomNav } from '../../contexts/BottomNavContext';
import { useScrollContainer } from '../../contexts/ScrollContainerContext';

export const BottomSentinel: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { setIsAtBottom } = useBottomNav();
  const { scrollContainerRef } = useScrollContainer();
  const lastScrollY = useRef(0);
  const isHiddenRef = useRef(false);
  const SCROLL_THRESHOLD = 50;
  
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    
    let currentScrollY: number;
    let scrollHeight: number;
    let clientHeight: number;
    
    if (container) {
      currentScrollY = container.scrollTop;
      scrollHeight = container.scrollHeight;
      clientHeight = container.clientHeight;
    } else {
      currentScrollY = window.scrollY;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    }
    
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
  }, [setIsAtBottom, scrollContainerRef]);
  
  useEffect(() => {
    const container = scrollContainerRef.current;
    
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
      setIsAtBottom(false);
    };
  }, [handleScroll, setIsAtBottom, scrollContainerRef]);
  
  return <div ref={sentinelRef} className="h-24 w-full pointer-events-none" aria-hidden="true" />;
};
