import React, { createContext, useContext } from 'react';
import { motion, Variants } from 'framer-motion';

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
  animate: (custom: TransitionCustom = defaultCustom) => ({
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 30,
      mass: 1 + ((custom?.distance ?? 1) * 0.1),
    },
  }),
  exit: (custom: TransitionCustom = defaultCustom) => ({
    x: (custom?.direction ?? 1) > 0 ? '-20%' : '20%',
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 30,
      mass: 1 + ((custom?.distance ?? 1) * 0.1),
    },
  }),
};

const DirectionalPageTransition: React.FC<DirectionalPageTransitionProps> = ({ children }) => {
  const transitionState = useTransitionState();
  
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
        overflow: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
};

export default DirectionalPageTransition;
