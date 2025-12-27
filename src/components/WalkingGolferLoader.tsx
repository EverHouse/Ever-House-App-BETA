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
      <svg 
        width="100" 
        height="180" 
        viewBox="0 0 100 180" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="walking-golfer-svg"
      >
        {/* Head with angular cap */}
        <g id="head" className="head">
          {/* Cap pointing up-left */}
          <polygon points="32,22 22,8 35,5 42,15" fill="#293515"/>
          {/* Head */}
          <polygon points="35,15 50,12 52,28 38,32" fill="#293515"/>
        </g>

        {/* Body/Torso - angular trapezoid */}
        <g id="body">
          <polygon points="32,32 55,28 62,75 28,80" fill="#293515"/>
        </g>

        {/* Right arm with golf bag */}
        <g id="arm-with-bag" className="arm-with-bag">
          {/* Arm extending right */}
          <polygon points="52,35 62,32 68,55 58,58" fill="#293515"/>
          {/* Golf bag - triangular */}
          <polygon points="60,45 75,38 78,75 62,78" fill="#293515"/>
        </g>

        {/* Left leg (front) */}
        <g id="leg-left" className="leg-left">
          {/* Thigh */}
          <polygon points="30,78 42,75 38,110 26,112" fill="#293515"/>
          {/* Shin */}
          <polygon points="26,110 38,108 32,145 20,148" fill="#293515"/>
          {/* Foot pointing left */}
          <polygon points="8,145 32,142 30,155 5,158" fill="#293515"/>
        </g>

        {/* Right leg (back) */}
        <g id="leg-right" className="leg-right">
          {/* Thigh */}
          <polygon points="45,78 58,75 68,105 55,110" fill="#293515"/>
          {/* Shin */}
          <polygon points="58,105 70,102 82,138 68,142" fill="#293515"/>
          {/* Foot pointing right */}
          <polygon points="70,138 92,135 95,150 72,153" fill="#293515"/>
        </g>
      </svg>

      <style>{`
        .head {
          transform-origin: 40px 22px;
          animation: headBob 0.5s ease-in-out infinite;
        }

        .arm-with-bag {
          transform-origin: 55px 40px;
          animation: armSwing 0.5s ease-in-out infinite;
        }

        .leg-left {
          transform-origin: 36px 78px;
          animation: legLeft 0.5s ease-in-out infinite;
        }

        .leg-right {
          transform-origin: 52px 78px;
          animation: legRight 0.5s ease-in-out infinite;
        }

        @keyframes headBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }

        @keyframes armSwing {
          0%, 100% { transform: rotate(2deg); }
          50% { transform: rotate(-2deg); }
        }

        @keyframes legLeft {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
        }

        @keyframes legRight {
          0%, 100% { transform: rotate(12deg); }
          50% { transform: rotate(-12deg); }
        }
      `}</style>
    </div>
  );
};

export default WalkingGolferLoader;
