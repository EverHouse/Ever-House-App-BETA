
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SwipeablePageProps {
  children: React.ReactNode;
  className?: string;
}

const SwipeablePage: React.FC<SwipeablePageProps> = ({ children, className = "" }) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  return (
    <div 
        className={`
            w-full min-h-full ${isDark ? 'bg-[#0f120a]' : 'bg-[#F2F2EC]'} relative
            ${className}
        `}
    >
        {children}
    </div>
  );
};

export default SwipeablePage;