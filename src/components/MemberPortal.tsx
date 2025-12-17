import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomTabBar, { TABS } from './BottomTabBar';
import Dashboard from '../pages/Member/Dashboard';
import BookGolf from '../pages/Member/BookGolf';
import MemberEvents from '../pages/Member/Events';
import MemberWellness from '../pages/Member/Wellness';
import Cafe from '../pages/Member/Cafe';
import Profile from '../pages/Member/Profile';

const MemberPortal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = useMemo(() => {
    const idx = TABS.findIndex(tab => location.pathname.startsWith(tab.path));
    return idx >= 0 ? idx : 0;
  }, [location.pathname]);

  const handleTabChange = (newIndex: number) => {
    navigate(TABS[newIndex].path, { replace: true });
  };

  const renderPage = () => {
    switch (activeIndex) {
      case 0: return <Dashboard />;
      case 1: return <BookGolf />;
      case 2: return <MemberEvents />;
      case 3: return <MemberWellness />;
      case 4: return <Cafe />;
      case 5: return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto safe-area-top">
        {renderPage()}
      </div>
      <BottomTabBar activeIndex={activeIndex} onTabChange={handleTabChange} />
    </div>
  );
};

export default MemberPortal;
