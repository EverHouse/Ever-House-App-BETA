import React, { useState, useEffect } from 'react';
import { useSmoothScroll } from './motion/SmoothScroll';

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

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = lenis?.scroll || window.scrollY;
      setIsVisible(scrollY > threshold);
    };

    if (lenis) {
      lenis.on('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    handleScroll();

    return () => {
      if (lenis) {
        lenis.off('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [lenis, threshold]);

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
