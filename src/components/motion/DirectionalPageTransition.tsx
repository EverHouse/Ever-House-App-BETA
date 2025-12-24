import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, Variants, useReducedMotion } from 'framer-motion';

export interface TransitionCustom {
  direction: number;
  distance: number;
}

const defaultCustom: TransitionCustom = { direction: 1, distance: 1 };

export const TransitionContext = createContext<TransitionCustom>(defaultCustom);

export const useTransitionState = () => useContext(TransitionContext);

interface DirectionalPageTransitionProps {
  children: React.ReactNode;
}

const pageVariants: Variants = {
  initial: (custom: TransitionCustom = defaultCustom) => ({
    x: (custom?.direction ?? 1) > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 35,
      mass: 0.8,
    },
  },
  exit: (custom: TransitionCustom = defaultCustom) => ({
    x: (custom?.direction ?? 1) > 0 ? '-15%' : '15%',
    opacity: 0,
    transition: {
      type: 'tween',
      duration: 0.2,
      ease: 'easeOut',
    },
  }),
};

const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.15 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.1 }
  },
};

const DirectionalPageTransition: React.FC<DirectionalPageTransitionProps> = ({ children }) => {
  const transitionState = useTransitionState();
  const prefersReducedMotion = useReducedMotion();
  
  // Detect touch devices to avoid transform issues that cause double-tap requirement
  const [isTouchDevice, setIsTouchDevice] = useState(
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const handleChange = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    // Support older Safari versions that use deprecated addListener API
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
  }, []);

  // On touch devices, skip motion transforms entirely to ensure single-tap works
  if (isTouchDevice || prefersReducedMotion) {
    return (
      <div style={{ minHeight: '100%' }}>
        {children}
      </div>
    );
  }
  
  return (
    <motion.div
      custom={transitionState}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        willChange: 'transform, opacity',
        minHeight: '100%',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
};

export default DirectionalPageTransition;
