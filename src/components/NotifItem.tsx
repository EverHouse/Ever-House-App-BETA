import React from 'react';

interface NotifItemProps {
  icon: string;
  title: string;
  desc: string;
  time: string;
}

const NotifItem: React.FC<NotifItemProps> = ({ icon, title, desc, time }) => (
  <div className="flex gap-3 p-3 rounded-xl glass-button border-0 bg-white/5 hover:bg-white/10 transition-colors">
     <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
     </div>
     <div>
        <div className="flex justify-between items-center w-full">
           <h4 className="font-bold text-sm text-white">{title}</h4>
           <span className="text-[10px] text-white/50 ml-2">{time}</span>
        </div>
        <p className="text-xs text-white/70 mt-0.5">{desc}</p>
     </div>
  </div>
);

export default NotifItem;