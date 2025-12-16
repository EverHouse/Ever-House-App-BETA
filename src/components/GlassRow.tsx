import React from 'react';

interface Action {
  icon: string;
  label: string;
  onClick: () => void;
}

interface GlassRowProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  actions?: Action[];
  delay?: string;
  onClick?: () => void;
}

const GlassRow: React.FC<GlassRowProps> = ({ title, subtitle, icon, color, actions, delay, onClick }) => (
   <div 
     onClick={onClick}
     className={`glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors border border-white/10 group animate-pop-in ${onClick ? 'cursor-pointer' : ''}`} 
     style={{animationDelay: delay, animationFillMode: 'both'}}
   >
      <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${color} border border-white/5`}>
         <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
         <h4 className="font-bold text-sm text-white truncate">{title}</h4>
         <p className="text-xs text-white/60 truncate">{subtitle}</p>
      </div>
      {actions && (
          <div className="flex gap-2">
            {actions.map((action, idx) => (
                <button 
                    key={idx} 
                    onClick={(e) => { e.stopPropagation(); action.onClick(); }} 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors active:scale-90" 
                    aria-label={action.label}
                >
                    <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                </button>
            ))}
          </div>
      )}
   </div>
);

export default GlassRow;