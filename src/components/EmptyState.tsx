import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isDark?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  isDark = false
}) => {
  return (
    <div className={`text-center py-12 px-6 rounded-2xl border-2 border-dashed ${
      isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
    }`}>
      <span className={`material-symbols-outlined text-5xl mb-4 ${
        isDark ? 'text-white/20' : 'text-gray-300'
      }`}>
        {icon}
      </span>
      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
        {title}
      </h3>
      <p className={`text-sm mb-4 max-w-xs mx-auto ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
