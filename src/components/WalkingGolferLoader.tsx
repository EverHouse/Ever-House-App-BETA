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
  const [isExiting, setIsExiting] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(true);
  const [tagline] = React.useState(() => taglines[Math.floor(Math.random() * taglines.length)]);

  React.useEffect(() => {
    if (!isVisible && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        onFadeComplete?.();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isExiting, onFadeComplete]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`loader-overlay ${isExiting ? 'loader-exit' : ''}`}
    >
      <div className={`loader-content ${isExiting ? 'content-exit' : ''}`}>
        <div className="walking-mascot">
          <img 
            src="/assets/logos/mascot-white.webp" 
            alt="Loading..." 
            className="mascot-image"
          />
        </div>
        <p className="tagline-text">{tagline}</p>
      </div>

      <style>{`
        .loader-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #293515;
          will-change: transform, height, clip-path;
        }

        .loader-exit {
          animation: minimizeToStatusBar 0.6s cubic-bezier(0.33, 1, 0.68, 1) forwards;
          pointer-events: none;
        }

        @keyframes minimizeToStatusBar {
          0% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
          }
          100% {
            clip-path: inset(0 0 100% 0);
            opacity: 0.95;
          }
        }

        .loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          will-change: opacity, transform;
        }

        .content-exit {
          animation: contentFadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes contentFadeOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.9) translateY(-20px);
          }
          100% {
            opacity: 0;
            transform: scale(0.7) translateY(-50px);
          }
        }

        .mascot-image {
          width: 120px;
          height: auto;
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
