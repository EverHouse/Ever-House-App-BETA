import { useState, useEffect } from 'react';

export function detectTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  try {
    if (navigator.maxTouchPoints > 0) return true;
    if ('ontouchstart' in window) return true;
    if (typeof window.matchMedia === 'function') {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia('(hover: none)').matches) return true;
    }
  } catch {
    return false;
  }
  
  return false;
}

export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(detectTouchDevice);

  useEffect(() => {
    const update = () => setIsTouchDevice(detectTouchDevice());
    
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    try {
      const coarseQuery = window.matchMedia('(pointer: coarse)');
      const hoverQuery = window.matchMedia('(hover: none)');
      
      const handleChange = () => setIsTouchDevice(detectTouchDevice());
      
      if (coarseQuery.addEventListener) {
        coarseQuery.addEventListener('change', handleChange);
        hoverQuery.addEventListener('change', handleChange);
      } else if (coarseQuery.addListener) {
        coarseQuery.addListener(handleChange);
        hoverQuery.addListener(handleChange);
      }

      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
        
        if (coarseQuery.removeEventListener) {
          coarseQuery.removeEventListener('change', handleChange);
          hoverQuery.removeEventListener('change', handleChange);
        } else if (coarseQuery.removeListener) {
          coarseQuery.removeListener(handleChange);
          hoverQuery.removeListener(handleChange);
        }
      };
    } catch {
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
      };
    }
  }, []);

  return isTouchDevice;
}

export default useIsTouchDevice;
