import React, { useState, useEffect, useCallback } from 'react';

interface BackToTopProps {
  threshold?: number;
  className?: string;
}

const BackToTop: React.FC<BackToTopProps> = ({ 
  threshold = 400,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
