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
      track: 'h-[24px] w-[40px]',
      thumb: 'h-[20px] w-[20px]',
      translate: 'translate-x-[16px]',
    },
    md: {
      track: 'h-[31px] w-[51px]',
      thumb: 'h-[27px] w-[27px]',
      translate: 'translate-x-[20px]',
    },
  };

  const { track, thumb, translate } = sizes[size];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative inline-flex ${track} shrink-0 cursor-pointer rounded-full 
        border-2 border-transparent transition-colors duration-200 ease-in-out 
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759] focus-visible:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${checked ? 'bg-[#34C759]' : 'bg-[#E9E9EB] dark:bg-[#39393D]'}
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block ${thumb} transform rounded-full 
          bg-white shadow-lg ring-0 transition duration-200 ease-in-out
          ${checked ? translate : 'translate-x-0'}
        `}
      />
    </button>
  );

  return toggle;
};

export default Toggle;
