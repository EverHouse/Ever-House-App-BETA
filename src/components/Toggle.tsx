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
      track: 'h-[26px] w-[50px]',
      thumb: 'h-[26px] w-[26px]',
      translate: 'translate-x-[24px]',
    },
    md: {
      track: 'h-[31px] w-[56px]',
      thumb: 'h-[31px] w-[31px]',
      translate: 'translate-x-[25px]',
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
        relative inline-flex items-center ${track} shrink-0 rounded-full
        transition-colors duration-200 ease-in-out 
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/50 focus-visible:ring-offset-2
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? 'bg-[#4CD964] shadow-[inset_0_0_0_2px_#4CD964]' : 'bg-[#E5E5EA] shadow-[inset_0_0_0_2px_#D1D1D6]'}
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
