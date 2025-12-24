import React, { useRef, useEffect, useCallback } from 'react';
import { useBottomNav } from '../../contexts/BottomNavContext';

export const BottomSentinel: React.FC = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { setIsAtBottom } = useBottomNav();
  const lastScrollY = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
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
