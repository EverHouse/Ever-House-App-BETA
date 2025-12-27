import React from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';
import WalkingGolferLoader from './WalkingGolferLoader';

const SAFETY_TIMEOUT_MS = 500;

const NavigationLoader: React.FC = () => {
  const { isNavigating, endNavigation } = useNavigationLoading();
  const location = useLocation();
  const prevPathRef = React.useRef(location.pathname);

  React.useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      if (isNavigating) {
        endNavigation();
      }
    }
  }, [location.pathname, isNavigating, endNavigation]);

  React.useEffect(() => {
    if (isNavigating) {
      const safetyTimer = setTimeout(() => {
        endNavigation();
      }, SAFETY_TIMEOUT_MS);
      return () => clearTimeout(safetyTimer);
    }
  }, [isNavigating, endNavigation]);

  if (!isNavigating) return null;

  return (
    <WalkingGolferLoader 
      isVisible={isNavigating} 
      onFadeComplete={endNavigation}
    />
  );
};

export default NavigationLoader;
