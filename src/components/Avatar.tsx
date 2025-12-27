import React from 'react';

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, email, size = 'md', className = '' }) => {
  const getInitials = (): string => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-accent text-brand-green font-bold flex items-center justify-center ${className}`}
    >
      {getInitials()}
    </div>
  );
};

export default Avatar;
