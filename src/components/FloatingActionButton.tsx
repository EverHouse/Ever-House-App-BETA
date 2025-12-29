import React from 'react';

export type FABColor = 'brand' | 'amber' | 'green' | 'purple' | 'red';

interface FloatingActionButtonProps {
  onClick: () => void;
  color?: FABColor;
  icon?: string;
  label?: string;
}

const colorClasses: Record<FABColor, string> = {
  brand: 'bg-primary dark:bg-white text-white dark:text-primary',
  amber: 'bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900',
  green: 'bg-emerald-600 dark:bg-emerald-500 text-white',
  purple: 'bg-purple-600 dark:bg-purple-500 text-white',
  red: 'bg-red-600 dark:bg-red-500 text-white',
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  color = 'brand',
  icon = 'add',
  label,
}) => {
  return (
    <button
      onClick={onClick}
      className={`fixed right-4 bottom-24 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${colorClasses[color]}`}
      aria-label={label || 'Add new item'}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </button>
  );
};

export default FloatingActionButton;
