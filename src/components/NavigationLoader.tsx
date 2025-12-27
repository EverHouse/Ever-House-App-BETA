import React from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';

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
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(41, 53, 21, 0.92)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="navigation-loader-mascot">
        <img 
          src="/assets/logos/mascot-white.webp" 
          alt="" 
          style={{
            width: '64px',
            height: 'auto',
          }}
        />
      </div>

      <style>{`
        .navigation-loader-mascot {
          animation: navWalk 0.4s ease-in-out infinite;
        }

        @keyframes navWalk {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-4px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
};

export default NavigationLoader;
