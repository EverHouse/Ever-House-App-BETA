import React, { createContext, useContext } from 'react';
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
  
  const variants = prefersReducedMotion ? reducedMotionVariants : pageVariants;
  
  return (
    <motion.div
      custom={transitionState}
      variants={variants}
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
