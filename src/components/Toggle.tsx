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
      track: 'h-[28px] w-[50px]',
      thumb: 'h-[22px] w-[22px]',
      translate: 'translate-x-[22px]',
    },
    md: {
      track: 'h-[34px] w-[60px]',
      thumb: 'h-[26px] w-[26px]',
      translate: 'translate-x-[26px]',
    },
  };

  const { track, thumb, translate } = sizes[size];

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
        relative inline-flex items-center ${track} shrink-0 rounded-full p-[4px]
        transition-colors duration-200 ease-in-out 
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/50 focus-visible:ring-offset-2
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? 'bg-[#5AC35A]' : 'bg-[#E5E5EA]'}
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block ${thumb} rounded-full 
          bg-white shadow-md transition-transform duration-200 ease-in-out
          ${checked ? translate : 'translate-x-0'}
        `}
      />
    </button>
  );
};

export default Toggle;
