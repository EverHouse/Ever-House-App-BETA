import React from 'react';
import { haptic } from '../utils/haptics';

interface DateButtonProps {
  day: string;
  date: string;
  active?: boolean;
  onClick?: () => void;
  isDark?: boolean;
}

const DateButton: React.FC<DateButtonProps> = ({ day, date, active, onClick, isDark = true }) => {
  const handleClick = () => {
    haptic.selection();
    onClick?.();
  };

  return (
    <button 
      onClick={handleClick} 
      className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-transform active:scale-95 border ${active ? 'bg-accent text-brand-green shadow-glow border-accent' : (isDark ? 'glass-button text-white border-white/10' : 'bg-white text-primary border-black/10 shadow-sm')}`}
    >
      <span className={`text-xs font-medium mb-1 ${active ? 'opacity-80' : 'opacity-60'}`}>{day}</span>
      <span className="text-xl font-bold">{date}</span>
    </button>
  );
};

export default DateButton;