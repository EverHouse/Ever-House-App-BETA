import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className = '',
}) => {
  const sizes = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4',
      padding: 'p-0.5',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5',
      padding: 'p-0.5',
    },
  };

  const { track, thumb, translate, padding } = sizes[size];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative inline-flex items-center ${track} ${padding} shrink-0 rounded-full 
        transition-colors duration-200 ease-in-out 
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/50 focus-visible:ring-offset-2
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? 'bg-[#34C759]' : 'bg-[#787880]/30'}
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block ${thumb} rounded-full 
          bg-white shadow-sm transition-transform duration-200 ease-in-out
          ${checked ? translate : 'translate-x-0'}
        `}
      />
    </button>
  );
};

export default Toggle;
