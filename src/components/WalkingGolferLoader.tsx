import React from 'react';

interface WalkingGolferLoaderProps {
  isVisible?: boolean;
  onFadeComplete?: () => void;
}

const WalkingGolferLoader: React.FC<WalkingGolferLoaderProps> = ({ isVisible = true, onFadeComplete }) => {
  const [isFadingOut, setIsFadingOut] = React.useState(false);

  React.useEffect(() => {
    if (!isVisible && !isFadingOut) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        onFadeComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isFadingOut, onFadeComplete]);

  if (!isVisible && !isFadingOut) return null;

  return (
    <div 
      className="loader-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2EC',
        transition: 'opacity 0.5s ease-out',
        opacity: isFadingOut ? 0 : 1,
      }}
    >
      <div className="walking-mascot">
        <img 
          src="/assets/logos/mascot-dark.webp" 
          alt="Loading..." 
          style={{
            width: '120px',
            height: 'auto',
          }}
        />
      </div>

      <style>{`
        .walking-mascot {
          animation: walk 0.6s ease-in-out infinite;
        }

        @keyframes walk {
          0%, 100% { 
            transform: translateY(0) rotate(-2deg); 
          }
          25% {
            transform: translateY(-8px) rotate(0deg);
          }
          50% { 
            transform: translateY(0) rotate(2deg); 
          }
          75% {
            transform: translateY(-8px) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
};

export default WalkingGolferLoader;
