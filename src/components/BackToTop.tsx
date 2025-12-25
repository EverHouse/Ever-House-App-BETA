import React, { useState, useEffect } from 'react';
import { useSmoothScroll } from './motion/SmoothScroll';
import { useScrollContainer } from '../contexts/ScrollContainerContext';

interface BackToTopProps {
  threshold?: number;
  className?: string;
}

const BackToTop: React.FC<BackToTopProps> = ({ 
  threshold = 400,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollTo, lenis } = useSmoothScroll();
  const { scrollContainerRef } = useScrollContainer();

  useEffect(() => {
    const handleScroll = () => {
      const container = scrollContainerRef.current;
      let scrollY: number;
      
      if (container) {
        scrollY = container.scrollTop;
      } else if (lenis) {
        scrollY = lenis.scroll;
      } else {
        scrollY = window.scrollY;
      }
      
      setIsVisible(scrollY > threshold);
    };

    const container = scrollContainerRef.current;
    
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    } else if (lenis) {
      lenis.on('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    handleScroll();

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      } else if (lenis) {
        lenis.off('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [lenis, threshold, scrollContainerRef]);

  const handleClick = () => {
    scrollTo(0, { duration: 0.8 });
  };

  return (
    <div className={`back-to-top ${isVisible ? 'visible' : ''} ${className}`}>
      <button
        onClick={handleClick}
        className="glass-button bg-white/90 dark:bg-black/70 text-primary dark:text-white hover:scale-110 active:scale-95 transition-all duration-300 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center"
        aria-label="Back to top"
      >
        <span className="material-symbols-outlined text-xl">keyboard_arrow_up</span>
      </button>
    </div>
  );
};

export default BackToTop;
