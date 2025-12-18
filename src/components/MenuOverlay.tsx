import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isStaffPortal?: boolean;
  onStaffNavChange?: (tab: any) => void;
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ isOpen, onClose, isStaffPortal = false, onStaffNavChange }) => {
  const navigate = useNavigate();
  const { user } = useData();

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleStaffNav = (tab: string) => {
    if (onStaffNavChange) {
      onStaffNavChange(tab);
    }
    onClose();
  };

  if (!isOpen) return null;

  const getActionButtonConfig = () => {
    if (isStaffPortal) {
        return { label: "MEMBER PORTAL", icon: "dashboard", action: () => handleNav('/dashboard') };
    }
    if (user?.role === 'admin' || user?.role === 'staff') {
        return { label: "STAFF PORTAL", icon: "admin_panel_settings", action: () => handleNav('/admin') };
    }
    if (user) {
        return { label: "MEMBER PORTAL", icon: "dashboard", action: () => handleNav('/dashboard') };
    }
    return { label: "MEMBER LOGIN", icon: "lock", action: () => handleNav('/login') };
  };

  const actionBtn = getActionButtonConfig();

  if (isStaffPortal) {
    return (
      <div className="fixed inset-0 z-[60] flex justify-start md:justify-center w-full max-w-md mx-auto overflow-hidden">
        <div 
          className="absolute inset-0 transition-opacity duration-500" 
          onClick={onClose}
        ></div>

        <div className="relative w-[85%] md:w-full h-full flex flex-col animate-slide-in-left shadow-[20px_0_50px_rgba(0,0,0,0.3)] overflow-hidden bg-[#1a1d15] backdrop-blur-xl border-r border-white/10">
          
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col h-full py-8 text-[#F2F2EC] safe-area-inset-menu">
              
              <div className="flex items-center justify-end mb-8">
                  <button 
                    onClick={onClose} 
                    className="w-10 h-10 flex items-center justify-center text-[#F2F2EC] hover:rotate-90 transition-transform duration-300 rounded-full hover:bg-white/10 active:scale-90"
                  >
                      <span className="material-symbols-outlined text-3xl">close</span>
                  </button>
              </div>
              
              <nav className="flex flex-col gap-5 flex-1 overflow-y-auto scrollbar-hide py-4">
                  <StaffMenuLink icon="groups" label="Directory" onClick={() => handleStaffNav('directory')} delay="0.05s" />
                  <StaffMenuLink icon="sports_golf" label="Simulators" onClick={() => handleStaffNav('simulator')} delay="0.08s" />
                  <StaffMenuLink icon="event" label="Events" onClick={() => handleStaffNav('events')} delay="0.11s" />
                  <StaffMenuLink icon="badge" label="Guest Passes" onClick={() => handleStaffNav('guests')} delay="0.14s" />
                  <StaffMenuLink icon="notifications" label="Push Notifications" onClick={() => handleStaffNav('push')} delay="0.17s" />
                  <StaffMenuLink icon="campaign" label="Announcements" onClick={() => handleStaffNav('announcements')} delay="0.2s" />
                  <StaffMenuLink icon="event_busy" label="Closures" onClick={() => handleStaffNav('closures')} delay="0.23s" />
                  <StaffMenuLink icon="photo_library" label="Gallery" onClick={() => handleStaffNav('gallery')} delay="0.26s" />
                  <StaffMenuLink icon="local_cafe" label="Cafe Menu" onClick={() => handleStaffNav('cafe')} delay="0.29s" />
              </nav>
              
              <div className="mt-4 pt-6 border-t border-white/10 space-y-4 animate-pop-in" style={{ animationDelay: '0.35s' }}>
                  <button 
                      onClick={() => handleNav('/')}
                      className="w-full group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
                  >
                      <span className="text-xl font-bold text-[#F2F2EC]">Public Site</span>
                      <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform backdrop-blur-md">
                          <span className="material-symbols-outlined text-[#F2F2EC]">arrow_forward</span>
                      </span>
                  </button>

                  <button 
                      onClick={actionBtn.action}
                      className="w-full bg-[#F2F2EC] text-[#293515] py-4 rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                      <span className="material-symbols-outlined text-lg">{actionBtn.icon}</span>
                      {actionBtn.label}
                  </button>
              </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-start md:justify-center w-full max-w-md mx-auto overflow-hidden">
      <div 
        className="absolute inset-0 transition-opacity duration-500" 
        onClick={onClose}
      ></div>

      <div className="relative w-[85%] md:w-full h-full flex flex-col animate-slide-in-left shadow-[20px_0_50px_rgba(0,0,0,0.15)] overflow-hidden bg-[#F2F2EC] backdrop-blur-xl border-r border-black/5">
        
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-multiply"></div>

        <div className="relative z-10 flex flex-col h-full py-8 text-[#293515] safe-area-inset-menu">
            
            <div className="flex items-center justify-end mb-8">
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 flex items-center justify-center text-[#293515] hover:rotate-90 transition-transform duration-300 rounded-full hover:bg-black/5 active:scale-90"
                >
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>
            </div>
            
            <nav className="flex flex-col gap-6 flex-1 overflow-y-auto scrollbar-hide py-4">
                <MenuLink label="Home" onClick={() => handleNav('/')} delay="0.05s" />
                <MenuLink label="Membership" onClick={() => handleNav('/membership')} delay="0.1s" />
                <MenuLink label="Host Events" onClick={() => handleNav('/private-hire')} delay="0.15s" />
                <MenuLink label="What's On" onClick={() => handleNav('/whats-on')} delay="0.2s" />
                <MenuLink label="Gallery" onClick={() => handleNav('/gallery')} delay="0.25s" />
                <MenuLink label="FAQ" onClick={() => handleNav('/faq')} delay="0.3s" />
            </nav>
            
            <div className="mt-4 pt-6 border-t border-[#293515]/10 space-y-4 animate-pop-in" style={{ animationDelay: '0.35s' }}>
                <button 
                    onClick={() => handleNav('/contact')}
                    className="w-full group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/40 transition-colors border border-transparent hover:border-white/50"
                >
                    <span className="text-xl font-bold text-[#293515]">Contact Us</span>
                    <span className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform backdrop-blur-md">
                        <span className="material-symbols-outlined text-[#293515]">arrow_forward</span>
                    </span>
                </button>

                <button 
                    onClick={actionBtn.action}
                    className="w-full bg-[#293515] text-[#F2F2EC] py-4 rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
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
    className="text-left text-[32px] font-display font-medium text-[#293515] hover:text-[#293515]/60 transition-all duration-300 tracking-tight animate-pop-in leading-tight hover:translate-x-2"
    style={{ animationDelay: delay, animationFillMode: 'both' }}
  >
    {label}
  </button>
);

const StaffMenuLink: React.FC<{ icon: string; label: string; onClick: () => void; delay: string }> = ({ icon, label, onClick, delay }) => (
  <button 
    onClick={onClick} 
    className="flex items-center gap-4 text-left text-[24px] font-display font-medium text-[#F2F2EC] hover:text-white/70 transition-all duration-300 tracking-tight animate-pop-in leading-tight hover:translate-x-2"
    style={{ animationDelay: delay, animationFillMode: 'both' }}
  >
    <span className="material-symbols-outlined text-[28px]">{icon}</span>
    {label}
  </button>
);

export default MenuOverlay;
