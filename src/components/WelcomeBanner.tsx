import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useTierPermissions } from '../hooks/useTierPermissions';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const WelcomeBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useData();
  const [dismissed, setDismissed] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const { permissions: tierPermissions } = useTierPermissions(user?.tier);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = (window.navigator as any).standalone === true || 
    window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (!user?.email) return;
    const key = `eh_welcome_dismissed_${user.email}`;
    const wasDismissed = localStorage.getItem(key);
    if (!wasDismissed) {
      setIsNew(true);
    }
  }, [user?.email]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    
    if (deferredPromptRef.current) {
      await deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        deferredPromptRef.current = null;
      }
    } else {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    if (user?.email) {
      localStorage.setItem(`eh_welcome_dismissed_${user.email}`, 'true');
    }
    setDismissed(true);
  };

  if (dismissed || !isNew || !user) return null;
  const firstName = user.name?.split(' ')[0] || 'Member';

  return (
    <>
      <div className="mb-6 p-5 glass-card">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-brand-green dark:text-accent">waving_hand</span>
            <h3 className="text-lg font-bold text-brand-green dark:text-white">
              Welcome to Even House, {firstName}!
            </h3>
          </div>
          <button 
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-black/10 transition-colors flex-shrink-0 text-brand-green/50 dark:text-white/50 hover:text-brand-green dark:hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <p className="text-sm mb-4 text-brand-green/70 dark:text-white/70">
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
            onClick={tierPermissions.canBookSimulators ? () => navigate('/book') : undefined}
          />
          <QuickTip 
            icon="celebration" 
            label="Upcoming Events" 
            value="RSVP"
            available={true}
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
            onClick={tierPermissions.dailyConfRoomMinutes > 0 ? () => navigate('/book?tab=conference') : undefined}
          />
          <QuickTip 
            icon="install_mobile" 
            label="Install App" 
            value={isInStandaloneMode ? "Installed" : "Add to Home"}
            available={true}
            onClick={handleInstallClick}
          />
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-[#1a1a1a] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-green dark:text-white">
                Add to Home Screen
              </h3>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full text-gray-400 dark:text-white/50 hover:text-gray-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="text-gray-600 dark:text-white/80">
              <p className="text-sm mb-4">
                Use your browser's menu to add this app to your home screen to receive push notifications regarding your bookings.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-white/10">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <p className="text-sm pt-0.5">
                    Tap the <strong>Share</strong> button at the bottom of the screen.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-white/10">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <p className="text-sm pt-0.5">
                    Scroll down and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-white/10">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <p className="text-sm pt-0.5">
                    Turn on the <strong>"Open as Web App"</strong> toggle.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-white/10">
                    <span className="text-xs font-bold">4</span>
                  </div>
                  <p className="text-sm pt-0.5">
                    Tap <strong>"Add"</strong> to place the icon on your Home Screen.
                  </p>
                </div>
              </div>
              
              <p className="text-sm mt-4 text-brand-green dark:text-accent">
                Don't forget to enable push notifications in your profile settings (top right icon)!
              </p>
            </div>
            
            <a
              href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-3 rounded-xl font-bold text-center block bg-brand-green dark:bg-accent text-white dark:text-brand-green"
            >
              View Full Instructions
            </a>
          </div>
        </div>
      )}
    </>
  );
};

const QuickTip: React.FC<{
  icon: string;
  label: string;
  value: string;
  available: boolean;
  onClick?: () => void;
}> = ({ icon, label, value, available, onClick }) => (
  <div 
    className={`flex items-center gap-2 p-2 rounded-[1rem] glass-button ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <span className={`material-symbols-outlined text-[18px] ${available ? 'text-brand-green dark:text-accent' : 'text-gray-400 dark:text-white/30'}`}>
      {available ? icon : 'lock'}
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] uppercase font-bold text-brand-green/50 dark:text-white/50">{label}</div>
      <div className="text-xs font-medium truncate text-brand-green dark:text-white">{value}</div>
    </div>
  </div>
);

export default WelcomeBanner;
