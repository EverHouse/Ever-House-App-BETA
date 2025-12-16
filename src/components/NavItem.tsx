import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavItemProps {
  to: string;
  icon: string;
  isActive: boolean;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, isActive, label }) => {
  const navigate = useNavigate();
  // Golf Icon should strictly remain outlined (no 'filled' class) even when active
  const isGolfIcon = icon === 'sports_golf';
  const shouldFill = isActive && !isGolfIcon;

  return (
    <button 
      onClick={() => navigate(to)} 
      className={`flex-1 h-full flex items-center justify-center rounded-xl transition-all duration-300 ${isActive ? 'bg-[#E7E7DC] text-[#293515] shadow-glow scale-105' : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}`}
      aria-label={label}
    >
      <span className={`material-symbols-outlined text-[24px] ${shouldFill ? 'filled' : ''}`}>{icon}</span>
    </button>
  );
};

export default NavItem;