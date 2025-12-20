import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Lenis from '@studio-freight/lenis';

interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollTo: (target: number | string | HTMLElement, options?: { offset?: number; duration?: number }) => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollTo: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export const SmoothScrollProvider: React.FC<SmoothScrollProviderProps> = ({ children }) => {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const mainContent = document.querySelector('#main-content') as HTMLElement;
    
    if (!mainContent) {
      console.warn('SmoothScroll: #main-content not found');
      return;
    }

    const lenisInstance = new Lenis({
      wrapper: mainContent,
      content: mainContent,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    });

    setLenis(lenisInstance);

    const raf = (time: number) => {
      lenisInstance.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };

    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      lenisInstance.destroy();
    };
  }, []);

  const scrollTo = (target: number | string | HTMLElement, options?: { offset?: number; duration?: number }) => {
    if (lenis) {
      lenis.scrollTo(target, {
        offset: options?.offset ?? 0,
        duration: options?.duration ?? 1.2,
      });
    }
  };

  return (
    <SmoothScrollContext.Provider value={{ lenis, scrollTo }}>
      {children}
    </SmoothScrollContext.Provider>
  );
};

export default SmoothScrollProvider;
