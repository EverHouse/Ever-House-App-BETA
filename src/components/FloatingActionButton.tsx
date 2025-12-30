import React from 'react';
import { createPortal } from 'react-dom';
import { useBottomNav } from '../contexts/BottomNavContext';

export type FABColor = 'brand' | 'amber' | 'green' | 'purple' | 'red';

interface FloatingActionButtonProps {
  onClick: () => void;
  color?: FABColor;
  icon?: string;
  secondaryIcon?: string;
  label?: string;
}

const colorClasses: Record<FABColor, string> = {
  brand: 'bg-primary dark:bg-white text-white dark:text-primary',
  amber: 'bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900',
  green: 'bg-[#293515] dark:bg-[#4a5f2a] text-white',
  purple: 'bg-[#CCB8E4] dark:bg-[#CCB8E4] text-[#293515] dark:text-[#293515]',
  red: 'bg-red-600 dark:bg-red-500 text-white',
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  color = 'brand',
  icon = 'add',
  secondaryIcon,
  label,
}) => {
  const { isAtBottom } = useBottomNav();
  
  const fabContent = (
    <button
      onClick={onClick}
      className={`fixed right-5 z-[9998] w-14 h-14 rounded-full shadow-lg flex items-center justify-center gap-0.5 transition-all duration-300 ease-out hover:scale-110 active:scale-95 ${colorClasses[color]}`}
      style={{ 
        bottom: isAtBottom 
          ? 'calc(24px + env(safe-area-inset-bottom, 0px))' 
          : 'calc(140px + env(safe-area-inset-bottom, 0px))' 
      }}
      aria-label={label || 'Add new item'}
    >
      <span className={`material-symbols-outlined ${secondaryIcon ? 'text-xl' : 'text-2xl'}`}>{icon}</span>
      {secondaryIcon && <span className="material-symbols-outlined text-lg">{secondaryIcon}</span>}
    </button>
  );
  
  return createPortal(fabContent, document.body);
};

export default FloatingActionButton;
