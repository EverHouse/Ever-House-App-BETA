import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface TabItem {
  path: string;
  icon: string;
  label: string;
}

const TABS: TabItem[] = [
  { path: '/dashboard', icon: 'home', label: 'Home' },
  { path: '/book', icon: 'sports_golf', label: 'Golf' },
  { path: '/member-events', icon: 'calendar_month', label: 'Events' },
  { path: '/member-wellness', icon: 'spa', label: 'Wellness' },
  { path: '/cafe', icon: 'coffee', label: 'Cafe' },
  { path: '/profile', icon: 'person', label: 'Profile' },
];

interface BottomTabBarProps {
  activeIndex?: number;
  onTabChange?: (index: number) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeIndex, onTabChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const currentIndex = activeIndex ?? TABS.findIndex(tab => location.pathname.startsWith(tab.path));

  const handleTabClick = (index: number) => {
    triggerHaptic('light');
    if (onTabChange) {
      onTabChange(index);
    } else {
      navigate(TABS[index].path);
    }
  };

  return (
    <nav className={`flex-shrink-0 ${isDark ? 'bg-[#0f120a]/95' : 'bg-[#F2F2EC]/95'} backdrop-blur-xl border-t ${isDark ? 'border-white/10' : 'border-black/5'} safe-area-bottom`}>
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {TABS.map((tab, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={tab.path}
              onClick={() => handleTabClick(index)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive 
                  ? isDark ? 'text-accent' : 'text-primary' 
                  : isDark ? 'text-white/40' : 'text-primary/40'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${isActive ? 'scale-110 filled' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-medium mt-0.5 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export { TABS };
export default BottomTabBar;
