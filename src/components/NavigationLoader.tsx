import React from 'react';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';

const NavigationLoader: React.FC = () => {
  const { isNavigating } = useNavigationLoading();
  const [visible, setVisible] = React.useState(false);
  const [fadeOut, setFadeOut] = React.useState(false);

  React.useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      setFadeOut(false);
    } else if (visible) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setFadeOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isNavigating, visible]);

  if (!visible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(41, 53, 21, 0.95)',
        backdropFilter: 'blur(8px)',
        transition: 'opacity 0.3s ease-out',
        opacity: fadeOut ? 0 : 1,
      }}
    >
      <div className="navigation-loader-mascot">
        <img 
          src="/assets/logos/mascot-white.webp" 
          alt="Loading..." 
          style={{
            width: '80px',
            height: 'auto',
          }}
        />
      </div>

      <style>{`
        .navigation-loader-mascot {
          animation: navWalk 0.5s ease-in-out infinite;
        }

        @keyframes navWalk {
          0%, 100% { 
            transform: translateY(0) rotate(-1deg); 
          }
          50% { 
            transform: translateY(-5px) rotate(1deg); 
          }
        }
      `}</style>
    </div>
  );
};

export default NavigationLoader;
