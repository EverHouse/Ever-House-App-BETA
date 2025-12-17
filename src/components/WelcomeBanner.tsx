import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { getTierPermissions } from '../utils/permissions';

const WelcomeBanner: React.FC = () => {
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-brand-green text-2xl">waving_hand</span>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-brand-green'}`}>
              Welcome to Even House, {firstName}!
            </h3>
          </div>
          <p className={`text-sm mb-4 ${isDark ? 'text-white/70' : 'text-brand-green/70'}`}>
            Here's a quick overview of your {user.tier || 'Social'} membership:
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <QuickTip 
              icon="sports_golf" 
              label="Golf Sims" 
              value={tierPermissions.canBookSimulators ? 'Included' : 'Upgrade needed'}
              available={tierPermissions.canBookSimulators}
              isDark={isDark}
            />
            <QuickTip 
              icon="calendar_month" 
              label="Book Ahead" 
              value={`${tierPermissions.advanceBookingDays} days`}
              available={true}
              isDark={isDark}
            />
            <QuickTip 
              icon="group_add" 
              label="Guest Passes" 
              value={tierPermissions.guestPassesPerMonth === 999 ? 'Unlimited' : `${tierPermissions.guestPassesPerMonth}/month`}
              available={tierPermissions.guestPassesPerMonth > 0}
              isDark={isDark}
            />
            <QuickTip 
              icon="spa" 
              label="Wellness" 
              value={tierPermissions.canAccessWellness ? 'Full Access' : 'Limited'}
              available={tierPermissions.canAccessWellness}
              isDark={isDark}
            />
          </div>

          <div className={`text-xs ${isDark ? 'text-white/50' : 'text-brand-green/50'}`}>
            Use the menu <span className="material-symbols-outlined text-[12px] align-middle">menu</span> to explore all features
          </div>
        </div>
        
        <button 
          onClick={handleDismiss}
          className={`p-1 rounded-full hover:bg-black/10 transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-brand-green/50 hover:text-brand-green'}`}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
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
}> = ({ icon, label, value, available, isDark }) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
    <span className={`material-symbols-outlined text-[18px] ${available ? 'text-green-600' : (isDark ? 'text-white/30' : 'text-gray-400')}`}>
      {available ? icon : 'lock'}
    </span>
    <div className="flex-1 min-w-0">
      <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-white/50' : 'text-brand-green/50'}`}>{label}</div>
      <div className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-brand-green'}`}>{value}</div>
    </div>
  </div>
);

export default WelcomeBanner;
