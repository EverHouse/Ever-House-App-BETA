import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SwipeableTabContainer from './SwipeableTabContainer';
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

  const currentTabIndex = useMemo(() => {
    const idx = TABS.findIndex(tab => location.pathname.startsWith(tab.path));
    return idx >= 0 ? idx : 0;
  }, [location.pathname]);

  const [activeIndex, setActiveIndex] = useState(currentTabIndex);

  useEffect(() => {
    setActiveIndex(currentTabIndex);
  }, [currentTabIndex]);

  const handleIndexChange = (newIndex: number) => {
    setActiveIndex(newIndex);
    navigate(TABS[newIndex].path, { replace: true });
  };

  const pages = useMemo(() => [
    <Dashboard key="dashboard" />,
    <BookGolf key="book" />,
    <MemberEvents key="events" />,
    <MemberWellness key="wellness" />,
    <Cafe key="cafe" />,
    <Profile key="profile" />,
  ], []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <SwipeableTabContainer
        activeIndex={activeIndex}
        onIndexChange={handleIndexChange}
      >
        {pages}
      </SwipeableTabContainer>
      <BottomTabBar activeIndex={activeIndex} onTabChange={handleIndexChange} />
    </div>
  );
};

export default MemberPortal;
