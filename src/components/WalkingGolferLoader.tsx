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
      className={`loader-container ${isFadingOut ? 'loader-fade-out' : ''}`}
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
        width="166" 
        height="273" 
        viewBox="0 0 166 273" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="walking-golfer-svg"
      >
        <g id="leg-left" className="leg-left">
          <path d="M148.33 260.39C148.06 257.48 130.44 254.25 128.72 253.91C127.04 253.34 124.7 252.8 123.49 251.41C105.11 250.82 105.41 251.71 105.56 254.46C106.91 268.46 110.31 272.25 117.08 271.38C124.58 267.36 141.69 265.64 148.33 260.39Z" fill="#293515"/>
          <path d="M131.29 246.23C131.47 247.26 130.05 249.38 121.21 143.63L101.15 251.35C104.28 254.38 131.29 246.23 131.29 246.23Z" fill="#293515"/>
        </g>
        <g id="leg-right" className="leg-right">
          <path d="M47.92 267.06C47.25 263.84 41.76 260.24 30.98 254.68C28.8 251.81 28.06 245.44 9.59 245.59C1.42 258.62 0.17 262.79 8.75 266.85C22.29 267.78 43.32 270.98 47.92 267.06Z" fill="#293515"/>
          <path d="M53.62 129.12C42.06 149.37 20.94 209.83 10 233.31C1.41 245.58 31.66 255.48 37.54 251.83C57.83 213.38 77.15 145.17 53.62 129.12Z" fill="#293515"/>
        </g>

        <g id="head" className="head">
          <path d="M67.12 45.12L59.49 39.35L66.4 17.88L91.23 14.27L97.76 28.9L100.19 34.12L79.21 48.24L67.12 45.12Z" fill="#293515"/>
          <path d="M114.39 15.79C110.79 19.04 98.82 28.19 97.91 19.24C102.31 19.56 114.39 15.79 114.39 15.79Z" fill="#293515"/>
        </g>

        <g id="hand-with-case" className="hand-with-case">
          <path d="M105.65 85.83L114.27 141.67L128.39 131.48L112.8 104.76L105.65 85.83Z" fill="#293515"/>
          <g id="club">
            <path d="M80.55 89.11L44.29 13.11C40.6 6.45 20.14 11.52 33.51 17.47C38.71 14.03 58.1 45.97 79.32 89.21Z" fill="#293515"/>
          </g>
          <path d="M90.52 154.21L164.44 171.54L162.89 175.73L104.12 197.42L90.52 154.21Z" fill="#293515"/>
        </g>
        
        <path d="M43.9 141.44L48.4 98.37L60.23 42.48L74.93 57.41L90.42 124.68L93.41 138.43L43.9 141.44Z" fill="#293515"/>
      </svg>

      <style>{`
        .leg-left {
          transform-origin: 85px 130px;
          animation: leftLeg 0.8s ease-in-out infinite;
        }

        .leg-right {
          transform-origin: 65px 130px;
          animation: rightLeg 0.8s ease-in-out infinite;
        }

        .hand-with-case {
          transform-origin: 90px 100px;
          animation: handWCase 0.8s ease-in-out infinite;
        }

        .head {
          transform-origin: 80px 30px;
          animation: headBob 0.8s ease-in-out infinite;
        }

        @keyframes leftLeg {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(35deg) translate(5px, -5px); }
        }

        @keyframes rightLeg {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-35deg) translate(-5px, 2px); }
        }

        @keyframes handWCase {
          0%, 100% { transform: translate(0, 0) rotate(2deg); }
          50% { transform: translate(-2px, -3px) rotate(-2deg); }
        }

        @keyframes headBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>
    </div>
  );
};

export default WalkingGolferLoader;
