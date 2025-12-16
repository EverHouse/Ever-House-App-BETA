import React from 'react';

interface DateButtonProps {
  day: string;
  date: string;
  active?: boolean;
  onClick?: () => void;
}

const DateButton: React.FC<DateButtonProps> = ({ day, date, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-transform active:scale-95 border ${active ? 'bg-white text-brand-green shadow-glow border-white' : 'glass-button text-white border-white/10'}`}
  >
    <span className={`text-xs font-medium mb-1 ${active ? 'opacity-80' : 'opacity-60'}`}>{day}</span>
    <span className="text-xl font-bold">{date}</span>
  </button>
);

export default DateButton;