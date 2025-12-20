import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiquidGlassOverlayProps {
  isTransitioning: boolean;
}

const overlayVariants = {
  hidden: {
    clipPath: 'inset(0 100% 0 0)',
    opacity: 0,
  },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    clipPath: 'inset(0 0 0 100%)',
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.1,
    },
  },
};

const LiquidGlassOverlay: React.FC<LiquidGlassOverlayProps> = ({ isTransitioning }) => {
  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          key="liquid-glass-overlay"
          className="fixed inset-0 z-50 pointer-events-none"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            backgroundColor: 'rgba(41, 53, 21, 0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            willChange: 'clip-path, opacity',
          }}
        />
      )}
    </AnimatePresence>
  );
};

export default LiquidGlassOverlay;
