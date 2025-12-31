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
  brand: 'bg-primary/70 dark:bg-white/70 text-white dark:text-primary backdrop-blur-xl border border-primary/20 dark:border-white/30',
  amber: 'bg-amber-500/70 dark:bg-amber-400/70 text-white dark:text-gray-900 backdrop-blur-xl border border-amber-400/30 dark:border-amber-300/40',
  green: 'bg-[#293515]/70 dark:bg-[#4a5f2a]/70 text-white backdrop-blur-xl border border-[#293515]/20 dark:border-[#4a5f2a]/30',
  purple: 'bg-[#CCB8E4]/70 dark:bg-[#CCB8E4]/70 text-[#293515] dark:text-[#293515] backdrop-blur-xl border border-[#CCB8E4]/30 dark:border-[#CCB8E4]/40',
  red: 'bg-red-600/70 dark:bg-red-500/70 text-white backdrop-blur-xl border border-red-500/20 dark:border-red-400/30',
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
      className={`fixed right-5 z-[9998] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 active:scale-95 ${colorClasses[color]}`}
      style={{ 
        bottom: isAtBottom 
          ? 'calc(24px + env(safe-area-inset-bottom, 0px))' 
          : 'calc(140px + env(safe-area-inset-bottom, 0px))' 
      }}
      aria-label={label || 'Add new item'}
    >
      {secondaryIcon ? (
        <div className="relative flex items-center justify-center w-full h-full">
          <span className="material-symbols-outlined text-2xl">{secondaryIcon}</span>
          <span className="material-symbols-outlined text-xs absolute left-2 top-1/2 -translate-y-1/2 opacity-90">{icon}</span>
        </div>
      ) : (
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      )}
    </button>
  );
  
  return createPortal(fabContent, document.body);
};

export default FloatingActionButton;
