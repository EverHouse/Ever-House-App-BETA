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
      className={`pb-3 border-b-[3px] text-sm whitespace-nowrap transition-colors ${
        active 
          ? (isDark ? 'border-white text-white font-bold' : 'border-primary text-primary font-bold') 
          : (isDark ? 'border-transparent text-white/60 font-medium' : 'border-transparent text-primary/60 font-medium')
      }`}
    >
      {label}
    </button>
  );
};

export default TabButton;