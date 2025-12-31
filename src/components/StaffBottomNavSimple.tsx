import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SafeAreaBottomOverlay } from './layout/SafeAreaBottomOverlay';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';
import { haptic } from '../utils/haptics';

interface StaffNavItem {
  path: string;
  icon: string;
  label: string;
}

const STAFF_NAV_ITEMS: StaffNavItem[] = [
  { path: '/admin', icon: 'home', label: 'Home' },
  { path: '/admin?tab=simulator', icon: 'event_note', label: 'Bookings' },
  { path: '/admin?tab=tours', icon: 'directions_walk', label: 'Tours' },
  { path: '/admin?tab=events', icon: 'calendar_month', label: 'Calendar' },
  { path: '/admin?tab=blocks', icon: 'event_busy', label: 'Closures' },
];

const StaffBottomNavSimple: React.FC = () => {
  const navigate = useNavigate();
  const { startNavigation } = useNavigationLoading();
  const navigatingRef = useRef(false);
  const itemCount = STAFF_NAV_ITEMS.length;
  
  const handleNavigation = useCallback((path: string) => {
    if (navigatingRef.current) return;
    haptic.light();
    navigatingRef.current = true;
    startNavigation();
    navigate(path);
    setTimeout(() => { navigatingRef.current = false; }, 500);
  }, [navigate, startNavigation]);
  
  const navContent = (
    <nav 
      className="relative mb-8 mx-auto w-[calc(100%-3rem)] max-w-md bg-black/60 backdrop-blur-xl border border-[#293515]/80 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)] rounded-full pointer-events-auto"
      role="navigation"
      aria-label="Staff navigation"
    >
      <div className="relative flex items-center w-full">
        {STAFF_NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            aria-label={item.label}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 relative z-10 cursor-pointer transition-all duration-300 ease-out active:scale-90 text-white/50 hover:text-white/80"
          >
            <span className="material-symbols-outlined text-xl transition-all duration-300">
              {item.icon}
            </span>
            <span className="text-[9px] tracking-wide font-medium">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
  
  return <SafeAreaBottomOverlay>{navContent}</SafeAreaBottomOverlay>;
};

export default StaffBottomNavSimple;
