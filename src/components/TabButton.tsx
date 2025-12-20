import React from 'react';
import { haptic } from '../utils/haptics';

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  isDark?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, onClick, isDark = true }) => {
  const handleClick = () => {
    haptic.light();
    onClick();
  };

  return (
    <button 
      onClick={handleClick}
      className={`px-4 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all ${
        active 
          ? (isDark 
            ? 'backdrop-blur-xl bg-white/10 border border-t-white/40 border-b-black/20 border-l-white/20 border-r-black/10 text-white font-bold scale-105 shadow-[0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]' 
            : 'backdrop-blur-xl bg-white/20 border border-t-white/40 border-b-black/20 border-l-white/30 border-r-black/10 text-primary font-bold scale-105 shadow-[0_8px_16px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)]'
            )
          : (isDark 
            ? 'border border-transparent text-white/60 font-medium hover:text-white/80 hover:bg-white/5' 
            : 'border border-transparent text-primary/60 font-medium hover:text-primary/80 hover:bg-white/10'
            )
      }`}
    >
      {label}
    </button>
  );
};

export default TabButton;