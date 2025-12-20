import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useTransitionState, TransitionCustom } from './DirectionalPageTransition';

export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: (custom: TransitionCustom = { direction: 1, distance: 1 }) => ({
    opacity: 0,
    x: (custom?.direction ?? 1) > 0 ? 16 : -16,
  }),
  visible: (custom: TransitionCustom = { direction: 1, distance: 1 }) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 30,
      mass: 1 + ((custom?.distance ?? 1) * 0.08),
    },
  }),
};

interface MotionListProps {
  children: React.ReactNode;
  className?: string;
}

export const MotionList: React.FC<MotionListProps> = ({ children, className }) => {
  const transitionState = useTransitionState();
  
  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      custom={transitionState}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface MotionListItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const MotionListItem: React.FC<MotionListItemProps> = ({ 
  children, 
  className, 
  onClick,
  style 
}) => {
  const transitionState = useTransitionState();
  
  return (
    <motion.div
      custom={transitionState}
      variants={listItemVariants}
      className={className}
      onClick={onClick}
      style={style}
    >
      {children}
    </motion.div>
  );
};

