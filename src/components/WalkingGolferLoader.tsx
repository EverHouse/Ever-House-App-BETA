import React from 'react';

interface WalkingGolferLoaderProps {
  isVisible?: boolean;
  onFadeComplete?: () => void;
}

const taglines = [
  "Your second home.",
  "Rooted in golf, built for community.",
  "Where design meets lifestyle.",
  "Elevate your everyday experience.",
  "Come in, settle down, stay awhile.",
  "A place to focus, meet, and connect.",
  "Step onto the green.",
  "Golf all year.",
  "Where every day feels like a day on the course.",
  "Practice with purpose.",
  "Tour-level data, right here at home.",
  "Inspire. Engage. Elevate.",
  "Effortless balance.",
  "Play through.",
  "Refined leisure.",
  "Always open.",
  "A welcoming community.",
  "More than a sport.",
  "Productivity meets leisure."
];

const WalkingGolferLoader: React.FC<WalkingGolferLoaderProps> = ({ isVisible = true, onFadeComplete }) => {
  const [isFadingOut, setIsFadingOut] = React.useState(false);
  const [tagline] = React.useState(() => taglines[Math.floor(Math.random() * taglines.length)]);

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
        backgroundColor: '#293515',
        transition: 'opacity 0.5s ease-out',
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      <div className="loader-content">
        <div className="walking-mascot">
          <img 
            src="/assets/logos/mascot-white.webp" 
            alt="Loading..." 
            style={{
              width: '120px',
              height: 'auto',
            }}
          />
        </div>
        <p className="tagline-text">{tagline}</p>
      </div>

      <style>{`
        .loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .tagline-text {
          font-family: 'Playfair Display', serif;
          color: white;
          font-size: 1rem;
          text-align: center;
          margin: 0;
          padding: 0 2rem;
          opacity: 0;
          animation: taglineFadeIn 0.6s ease-out 0.3s forwards;
        }

        @keyframes taglineFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
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
