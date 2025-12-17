import React from 'react';

interface ScrollIndicatorProps {
  direction?: 'horizontal' | 'vertical';
  label?: string;
  isDark?: boolean;
}

const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({
  direction = 'horizontal',
  label = 'Swipe to see more',
  isDark = false
}) => {
  const icon = direction === 'horizontal' ? 'swipe' : 'swipe_vertical';
  
  return (
    <div className={`flex items-center justify-center gap-1.5 py-2 ${
      isDark ? 'text-white/40' : 'text-gray-400'
    }`}>
      <span className="material-symbols-outlined text-[16px] animate-pulse">{icon}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
};

export default ScrollIndicator;
