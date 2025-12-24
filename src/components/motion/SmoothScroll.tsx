import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Lenis from '@studio-freight/lenis';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';

interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollTo: (target: number | string | HTMLElement, options?: { offset?: number; duration?: number }) => void;
  stop: () => void;
  start: () => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollTo: () => {},
  stop: () => {},
  start: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export const SmoothScrollProvider: React.FC<SmoothScrollProviderProps> = ({ children }) => {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const isTouchDevice = useIsTouchDevice();
  const rafRef = useRef<number>();

  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
      }
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleChange);
        }
      };
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isTouchDevice) {
      if (lenis) {
        lenis.destroy();
        setLenis(null);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      return;
    }

    const lenisInstance = new Lenis({
      wrapper: window as any,
      content: document.body,
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.0,
      wheelMultiplier: 0.8,
      autoResize: true,
      syncTouch: true,
      syncTouchLerp: 0.06,
    });

    setLenis(lenisInstance);

    const raf = (time: number) => {
      lenisInstance.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };

    rafRef.current = requestAnimationFrame(raf);

    let lastScrollY = window.scrollY;
    const handleNativeScroll = () => {
      if (window.scrollY === 0 && lastScrollY > 100) {
        lenisInstance.scrollTo(0, { immediate: true });
      }
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleNativeScroll, { passive: true });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener('scroll', handleNativeScroll);
      lenisInstance.destroy();
    };
  }, [prefersReducedMotion, isTouchDevice]);

  const scrollTo = useCallback((target: number | string | HTMLElement, options?: { offset?: number; duration?: number }) => {
    if (lenis) {
      lenis.scrollTo(target, {
        offset: options?.offset ?? 0,
        duration: options?.duration ?? 1.0,
      });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [lenis]);

  const stop = useCallback(() => {
    lenis?.stop();
  }, [lenis]);

  const start = useCallback(() => {
    lenis?.start();
  }, [lenis]);

  const value = useMemo(() => ({ lenis, scrollTo, stop, start }), [lenis, scrollTo, stop, start]);

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
};

export default SmoothScrollProvider;
