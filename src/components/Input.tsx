import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: string;
}

const Input: React.FC<InputProps> = ({ label, icon, className = "", ...props }) => (
  <div>
    <label className="block text-sm font-bold text-primary mb-1.5 pl-1">{label}</label>
    <div className="relative">
        <input 
            className={`w-full bg-[#F9F9F7] border-0 rounded-lg py-3 px-4 text-primary ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6 ${className}`} 
            {...props} 
        />
        {icon && (
            <span className="material-symbols-outlined absolute right-3 top-3 text-gray-400 text-lg pointer-events-none">{icon}</span>
        )}
    </div>
  </div>
);

export default Input;