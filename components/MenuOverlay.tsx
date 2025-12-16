import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useData();

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  // Logic for the Action Button (now at bottom)
  const getActionButtonConfig = () => {
    if (user?.role === 'admin' || user?.role === 'staff') {
        return { label: "STAFF PORTAL", icon: "admin_panel_settings", action: () => handleNav('/admin') };
    }
    if (user) {
        return { label: "MEMBER PORTAL", icon: "dashboard", action: () => handleNav('/dashboard') };
    }
    return { label: "MEMBER LOGIN", icon: "lock", action: () => handleNav('/login') };
  };

  const actionBtn = getActionButtonConfig();

  return (
    <div className="fixed inset-0 z-50 flex justify-start md:justify-center w-full max-w-md mx-auto overflow-hidden">
      {/* 
          Background Dimmer
      */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500" 
        onClick={onClose}
      ></div>

      {/* 
          Menu Panel - Light Theme "Bone" aesthetic
          Sliding in from LEFT
      */}
      <div className="relative w-[85%] md:w-full h-full flex flex-col animate-slide-in-left shadow-2xl overflow-hidden bg-[#F2F2EC]">
        
        {/* Subtle Grain Texture */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full px-8 py-8 text-[#293515]">
            
            {/* Header: Close Button Only (Logo Removed) */}
            <div className="flex items-center justify-end mb-8">
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 flex items-center justify-center text-[#293515] hover:rotate-90 transition-transform duration-300"
                >
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>
            </div>
            
            {/* Navigation Links */}
            <nav className="flex flex-col gap-6 flex-1 overflow-y-auto scrollbar-hide py-4">
                <MenuLink label="Home" onClick={() => handleNav('/')} delay="0.05s" />
                <MenuLink label="Membership" onClick={() => handleNav('/membership')} delay="0.1s" />
                <MenuLink label="Host Events" onClick={() => handleNav('/private-hire')} delay="0.15s" />
                <MenuLink label="What’s On" onClick={() => handleNav('/whats-on')} delay="0.2s" />
                <MenuLink label="Gallery" onClick={() => handleNav('/gallery')} delay="0.25s" />
                <MenuLink label="FAQ" onClick={() => handleNav('/faq')} delay="0.3s" />
            </nav>
            
            {/* Bottom Section: Contact & Login */}
            <div className="mt-4 pt-6 border-t border-[#293515]/10 space-y-4 animate-pop-in" style={{ animationDelay: '0.35s' }}>
                <button 
                    onClick={() => handleNav('/contact')}
                    className="w-full group flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#293515]/5 transition-colors"
                >
                    <span className="text-xl font-bold text-[#293515]">Contact Us</span>
                    <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[#293515]">arrow_forward</span>
                    </span>
                </button>

                <button 
                    onClick={actionBtn.action}
                    className="w-full bg-[#293515] text-[#F2F2EC] py-4 rounded-xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
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

const MenuLink: React.FC<{ label: string; onClick: () => void; delay: string }> = ({ label, onClick, delay }) => (
  <button 
    onClick={onClick} 
    className="text-left text-[32px] font-display font-medium text-[#293515] hover:text-[#293515]/70 transition-all duration-300 tracking-tight animate-pop-in leading-tight"
    style={{ animationDelay: delay, animationFillMode: 'both' }}
  >
    {label}
  </button>
);

export default MenuOverlay;