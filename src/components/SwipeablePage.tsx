import React from 'react';

interface SwipeablePageProps {
  children: React.ReactNode;
  className?: string;
}

const SwipeablePage: React.FC<SwipeablePageProps> = ({ children, className = "" }) => {
  return (
    <div 
      className={`w-full min-h-full bg-[#F2F2EC] dark:bg-[#0f120a] relative animate-page-enter ${className}`}
    >
      {children}
    </div>
  );
};

export default SwipeablePage;
