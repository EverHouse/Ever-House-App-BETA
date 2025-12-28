import React from 'react';

interface WalkingGolferSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const WalkingGolferSpinner: React.FC<WalkingGolferSpinnerProps> = ({ 
  size = 'md',
  className = '' 
}) => {
  const sizeStyles = {
    sm: { width: '24px' },
    md: { width: '48px' },
    lg: { width: '80px' }
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="walking-mascot-spinner">
        <img 
          src="/assets/logos/mascot-dark.webp" 
          alt="Loading..." 
          style={sizeStyles[size]}
          className="h-auto"
        />
      </div>

      <style>{`
        .walking-mascot-spinner {
          animation: walkSpinner 0.6s ease-in-out infinite;
        }

        @keyframes walkSpinner {
          0%, 100% { 
            transform: translateY(0) rotate(-2deg); 
          }
          25% {
            transform: translateY(-4px) rotate(0deg);
          }
          50% { 
            transform: translateY(0) rotate(2deg); 
          }
          75% {
            transform: translateY(-4px) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
};

export default WalkingGolferSpinner;
