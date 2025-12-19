import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { getTierPermissions } from '../utils/permissions';

const WelcomeBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const [dismissed, setDismissed] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const key = `eh_welcome_dismissed_${user.email}`;
    const wasDismissed = localStorage.getItem(key);
    if (!wasDismissed) {
      setIsNew(true);
    }
  }, [user?.email]);

  const handleDismiss = () => {
    if (user?.email) {
      localStorage.setItem(`eh_welcome_dismissed_${user.email}`, 'true');
    }
    setDismissed(true);
  };

  if (dismissed || !isNew || !user) return null;

  const tierPermissions = getTierPermissions(user.tier || 'Social');
  const firstName = user.name?.split(' ')[0] || 'Member';

  return (
    <div className={`mb-6 p-5 rounded-2xl border ${isDark ? 'bg-accent/10 border-accent/30' : 'bg-accent/20 border-accent/40'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-2xl ${isDark ? 'text-accent' : 'text-brand-green'}`}>waving_hand</span>
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-brand-green'}`}>
            Welcome to Even House, {firstName}!
          </h3>
        </div>
        <button 
          onClick={handleDismiss}
          className={`p-1 rounded-full hover:bg-black/10 transition-colors flex-shrink-0 ${isDark ? 'text-white/50 hover:text-white' : 'text-brand-green/50 hover:text-brand-green'}`}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      
      <p className={`text-sm mb-4 ${isDark ? 'text-white/70' : 'text-brand-green/70'}`}>
        Here's a quick overview of your {user.tier || 'Social'} membership:
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        <QuickTip 
          icon="sports_golf" 
          label="Golf Sims" 
          value={tierPermissions.canBookSimulators 
            ? (tierPermissions.dailySimulatorMinutes === 999 ? 'Unlimited' : `${tierPermissions.dailySimulatorMinutes}min/day`)
            : 'Upgrade needed'}
          available={tierPermissions.canBookSimulators}
          isDark={isDark}
          onClick={tierPermissions.canBookSimulators ? () => navigate('/book') : undefined}
        />
        <QuickTip 
          icon="celebration" 
          label="Upcoming Events" 
          value="RSVP"
          available={true}
          isDark={isDark}
          onClick={() => navigate('/member-events')}
        />
        <QuickTip 
          icon="meeting_room" 
          label="Conference Room" 
          value={tierPermissions.dailyConfRoomMinutes === 999 
            ? 'Unlimited' 
            : tierPermissions.dailyConfRoomMinutes > 0 
              ? `${tierPermissions.dailyConfRoomMinutes}min/day` 
              : 'Not included'}
          available={tierPermissions.dailyConfRoomMinutes > 0}
          isDark={isDark}
          onClick={tierPermissions.dailyConfRoomMinutes > 0 ? () => navigate('/book?tab=conference') : undefined}
        />
        <QuickTip 
          icon="self_improvement" 
          label="MedSpa" 
          value="Book Services"
          available={true}
          isDark={isDark}
          onClick={() => navigate('/member-wellness?tab=medspa')}
        />
      </div>
    </div>
  );
};

const QuickTip: React.FC<{
  icon: string;
  label: string;
  value: string;
  available: boolean;
  isDark: boolean;
  onClick?: () => void;
}> = ({ icon, label, value, available, isDark, onClick }) => (
  <div 
    className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white/50'} ${onClick ? 'cursor-pointer hover:bg-white/20 active:scale-95 transition-all' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <span className={`material-symbols-outlined text-[18px] ${available ? 'text-accent' : (isDark ? 'text-white/30' : 'text-gray-400')}`}>
      {available ? icon : 'lock'}
    </span>
    <div className="flex-1 min-w-0">
      <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-white/50' : 'text-brand-green/50'}`}>{label}</div>
      <div className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-brand-green'}`}>{value}</div>
    </div>
  </div>
);

export default WelcomeBanner;
