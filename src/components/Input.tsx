import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: string;
}

const Input: React.FC<InputProps> = ({ label, icon, className = "", ...props }) => (
  <div>
    <label className="block text-sm font-bold text-primary dark:text-white mb-1.5 pl-1">{label}</label>
    <div className="relative">
        <input 
            className={`w-full glass-input py-3 px-4 text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 sm:text-sm sm:leading-6 ${className}`} 
            {...props} 
        />
        {icon && (
            <span className="material-symbols-outlined absolute right-3 top-3 text-gray-400 dark:text-gray-500 text-lg pointer-events-none">{icon}</span>
        )}
    </div>
  </div>
);

export default Input;