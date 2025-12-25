import React, { useRef, useEffect, useCallback } from 'react';
import { useBottomNav } from '../../contexts/BottomNavContext';
import { useScrollContainer } from '../../contexts/ScrollContainerContext';

export const BottomSentinel: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { setIsAtBottom } = useBottomNav();
  const { scrollContainerRef } = useScrollContainer();
  const lastScrollY = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  
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
    
    if (currentScrollY > lastScrollY.current) {
      scrollDirectionRef.current = 'down';
    } else if (currentScrollY < lastScrollY.current) {
      scrollDirectionRef.current = 'up';
    }
    lastScrollY.current = currentScrollY;
    
    const distanceFromBottom = scrollHeight - (currentScrollY + clientHeight);
    const isNearBottom = distanceFromBottom < 50;
    const shouldHide = isScrollable && isNearBottom && scrollDirectionRef.current === 'down';
    
    setIsAtBottom(shouldHide);
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
