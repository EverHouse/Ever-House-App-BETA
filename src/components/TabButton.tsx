import React from 'react';
import { haptic } from '../utils/haptics';

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, onClick }) => {
  const handleClick = () => {
    haptic.light();
    onClick();
  };

  return (
    <button 
      onClick={handleClick}
      className={`pb-3 border-b-[3px] ${active ? 'border-white text-white font-bold' : 'border-transparent text-white/60 font-medium'} text-sm whitespace-nowrap transition-colors`}
    >
      {label}
    </button>
  );
};

export default TabButton;