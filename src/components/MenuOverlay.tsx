import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, actualUser } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  const getActionButtonConfig = () => {
    if (actualUser?.role === 'admin' || actualUser?.role === 'staff') {
        return { label: "STAFF PORTAL", icon: "admin_panel_settings", action: () => handleNav('/admin') };
    }
    if (user) {
        return { label: "MEMBER PORTAL", icon: "dashboard", action: () => handleNav('/dashboard') };
    }
    return { label: "MEMBER LOGIN", icon: "lock", action: () => handleNav('/login') };
  };

  const actionBtn = getActionButtonConfig();

  return (
    <div className="fixed inset-0 z-[10000] flex justify-start overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-xl transition-opacity duration-500" 
        onClick={onClose}
      ></div>

      <div className="relative w-[85%] md:w-[320px] lg:w-[360px] h-full flex flex-col animate-slide-in-left overflow-hidden glass-navbar rounded-none rounded-r-[2rem] border-l-0">
        
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-multiply"></div>

        <div className={`relative z-10 flex flex-col h-full py-8 safe-area-inset-menu ${isDark ? 'text-[#F2F2EC]' : 'text-[#293515]'}`}>
            
            <div className="flex items-center justify-end mb-8">
                <button 
                  onClick={onClose} 
                  className={`w-10 h-10 flex items-center justify-center hover:rotate-90 transition-transform duration-300 rounded-full active:scale-90 ${isDark ? 'text-[#F2F2EC] hover:bg-white/10' : 'text-[#293515] hover:bg-black/5'}`}
                >
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>
            </div>
            
            <nav className="flex flex-col gap-6 flex-1 overflow-y-auto scrollbar-hide py-4">
                <MenuLink label="Home" onClick={() => handleNav('/')} delay="0.05s" isDark={isDark} />
                <MenuLink label="Membership" onClick={() => handleNav('/membership')} delay="0.1s" isDark={isDark} />
                <MenuLink label="Cafe" onClick={() => handleNav('/menu')} delay="0.15s" isDark={isDark} />
                <MenuLink label="Host Events" onClick={() => handleNav('/private-hire')} delay="0.2s" isDark={isDark} />
                <MenuLink label="What's On" onClick={() => handleNav('/whats-on')} delay="0.25s" isDark={isDark} />
                <MenuLink label="Gallery" onClick={() => handleNav('/gallery')} delay="0.3s" isDark={isDark} />
                <MenuLink label="FAQ" onClick={() => handleNav('/faq')} delay="0.35s" isDark={isDark} />
            </nav>
            
            <div className={`mt-4 pt-6 border-t space-y-4 animate-pop-in ${isDark ? 'border-[#F2F2EC]/10' : 'border-[#293515]/10'}`} style={{ animationDelay: '0.4s' }}>
                <button 
                    onClick={() => handleNav('/contact')}
                    className={`w-full group flex items-center justify-between px-4 py-3 rounded-[2rem] glass-button border ${isDark ? 'border-white/20' : 'border-white/50'}`}
                >
                    <span className={`text-xl font-bold ${isDark ? 'text-[#F2F2EC]' : 'text-[#293515]'}`}>Contact Us</span>
                    <span className="w-10 h-10 rounded-full glass-button flex items-center justify-center group-hover:scale-110 transition-all duration-[400ms] ease-in-out">
                        <span className={`material-symbols-outlined ${isDark ? 'text-[#F2F2EC]' : 'text-[#293515]'}`}>arrow_forward</span>
                    </span>
                </button>

                <button 
                    onClick={actionBtn.action}
                    className={`w-full py-4 rounded-[2rem] font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-[400ms] ease-in-out ${isDark ? 'bg-accent text-[#293515]' : 'bg-[#293515] text-[#F2F2EC]'}`}
                >
                    <span className="material-symbols-outlined text-lg">{actionBtn.icon}</span>
                    {actionBtn.label}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const MenuLink: React.FC<{ label: string; onClick: () => void; delay: string; isDark: boolean }> = ({ label, onClick, delay, isDark }) => (
  <button 
    onClick={onClick} 
    className={`text-left text-[32px] font-display font-medium transition-all duration-300 tracking-tight animate-pop-in leading-tight hover:translate-x-2 ${isDark ? 'text-[#F2F2EC] hover:text-[#F2F2EC]/60' : 'text-[#293515] hover:text-[#293515]/60'}`}
    style={{ animationDelay: delay, animationFillMode: 'both' }}
  >
    {label}
  </button>
);

export default MenuOverlay;
