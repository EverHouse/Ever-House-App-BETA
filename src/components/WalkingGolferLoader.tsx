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
  const [videoLoaded, setVideoLoaded] = React.useState(false);
  const [tagline] = React.useState(() => taglines[Math.floor(Math.random() * taglines.length)]);

  React.useEffect(() => {
    if (!isVisible && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        onFadeComplete?.();
      }, 750);
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
          <video 
            src="/assets/logos/walking-mascot-white.webm" 
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={() => setVideoLoaded(true)}
            className={`mascot-video ${videoLoaded ? 'video-loaded' : ''}`}
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
          animation: minimizeToStatusBar 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          pointer-events: none;
        }

        @keyframes minimizeToStatusBar {
          0% {
            transform: translateY(0) scaleY(1);
            transform-origin: top center;
            opacity: 1;
            border-radius: 0;
          }
          40% {
            transform: translateY(0) scaleY(0.4);
            transform-origin: top center;
            opacity: 1;
            border-radius: 0 0 24px 24px;
          }
          70% {
            transform: translateY(0) scaleY(0.08);
            transform-origin: top center;
            opacity: 0.9;
            border-radius: 0 0 16px 16px;
          }
          100% {
            transform: translateY(0) scaleY(0);
            transform-origin: top center;
            opacity: 0;
            border-radius: 0;
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
          animation: contentFadeOut 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes contentFadeOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          60% {
            opacity: 0;
            transform: scale(0.85) translateY(-40px);
          }
          100% {
            opacity: 0;
            transform: scale(0.6) translateY(-80px);
          }
        }

        .mascot-video {
          width: 120px;
          height: auto;
          background: transparent;
          opacity: 0;
          transition: opacity 0.2s ease-in;
        }

        .mascot-video.video-loaded {
          opacity: 1;
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
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default WalkingGolferLoader;
