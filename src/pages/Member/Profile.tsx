import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getTierPermissions } from '../../utils/permissions';
import HubSpotFormModal from '../../components/HubSpotFormModal';


const GUEST_CHECKIN_FIELDS = [
  { name: 'guest_firstname', label: 'Guest First Name', type: 'text' as const, required: true, placeholder: 'John' },
  { name: 'guest_lastname', label: 'Guest Last Name', type: 'text' as const, required: true, placeholder: 'Smith' },
  { name: 'guest_email', label: 'Guest Email', type: 'email' as const, required: true, placeholder: 'john@example.com' },
  { name: 'guest_phone', label: 'Guest Phone', type: 'tel' as const, required: false, placeholder: '(555) 123-4567' }
];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useData();
  const { themeMode, setThemeMode, effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [showGuestCheckin, setShowGuestCheckin] = useState(false);
  const [guestPasses, setGuestPasses] = useState<{ passes_used: number; passes_total: number; passes_remaining: number } | null>(null);

  const tierPermissions = getTierPermissions(user?.tier || 'Social');

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/guest-passes/${encodeURIComponent(user.email)}?tier=${encodeURIComponent(user.tier || 'Social')}`)
        .then(res => res.json())
        .then(data => setGuestPasses(data))
        .catch(err => console.error('Error fetching guest passes:', err));
    }
  }, [user?.email, user?.tier]);

  if (!user) return null;

  return (
    <div className="px-6 pt-6 pb-24">
      <div className="flex flex-col items-center mb-8">
         <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-accent to-purple-500 mb-4 shadow-glow">
            <img src={user.avatar || "https://i.pravatar.cc/300"} className={`w-full h-full rounded-full object-cover border-4 ${isDark ? 'border-[#0f172a]' : 'border-white'}`} alt="Profile" />
         </div>
         <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{user.name}</h1>
         <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-green text-[#F2F2EC]">{user.tier} Member</span>
            <span className={`text-xs ${isDark ? 'opacity-50' : 'text-primary/50'}`}>#{user.id}</span>
         </div>
      </div>

      {/* Wallet Pass Preview */}
      <div onClick={() => setIsCardOpen(true)} className="relative h-48 w-full rounded-[1.5rem] overflow-hidden cursor-pointer transform transition-transform active:scale-95 shadow-2xl mb-8 group">
         {/* Card Background */}
         <div className="absolute inset-0 bg-[#293515]"></div>
         {/* Gloss */}
         <div className="absolute inset-0 bg-glossy opacity-50"></div>
         {/* Content */}
         <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
               <img src="/assets/logos/monogram-white.png" className="w-8 h-8 opacity-90" alt="" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-[#F2F2EC]/60">Even House</span>
            </div>
            <div>
               <p className="text-xs text-[#F2F2EC]/60 uppercase tracking-wider mb-1">Member</p>
               <h3 className="text-xl font-bold tracking-wide text-[#F2F2EC]">{user.name}</h3>
            </div>
         </div>
         {/* Tap Hint */}
         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
             <span className="font-bold text-sm">Tap to View</span>
         </div>
      </div>

      <div className="space-y-6">
         <Section title="Account" isDark={isDark}>
            <Row icon="mail" label="Email" value={user.email} isDark={isDark} />
            <Row icon="call" label="Phone" value={user.phone} isDark={isDark} />
         </Section>

         <Section title="Membership Benefits" isDark={isDark}>
            <Row icon="calendar_month" label="Advance Booking" value={`${tierPermissions.advanceBookingDays} days`} isDark={isDark} />
            {tierPermissions.canBookSimulators && (
              <Row icon="sports_golf" label="Daily Simulator Time" value={`${tierPermissions.dailySimulatorMinutes} min`} isDark={isDark} />
            )}
            {guestPasses && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-lg ${isDark ? 'opacity-60' : 'text-primary/60'}`}>group_add</span>
                    <span className={`text-sm ${isDark ? '' : 'text-primary'}`}>Guest Passes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isDark ? 'text-accent' : 'text-brand-green'}`}>{guestPasses.passes_remaining}</span>
                    <span className={`text-xs ${isDark ? 'opacity-50' : 'text-primary/50'}`}>/ {guestPasses.passes_total} remaining</span>
                  </div>
                </div>
                {guestPasses.passes_remaining > 0 && (
                  <button
                    onClick={() => setShowGuestCheckin(true)}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-accent/20 hover:bg-accent/30 text-accent' : 'bg-brand-green/10 hover:bg-brand-green/20 text-brand-green'}`}
                  >
                    <span className="material-symbols-outlined text-lg">confirmation_number</span>
                    Check In a Guest
                  </button>
                )}
              </div>
            )}
         </Section>

         <Section title="Appearance" isDark={isDark}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className={`material-symbols-outlined text-lg ${isDark ? 'opacity-60' : 'text-primary/60'}`}>palette</span>
                <span className={`text-sm font-medium ${isDark ? '' : 'text-primary'}`}>Theme</span>
              </div>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setThemeMode(mode)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                      themeMode === mode 
                        ? 'bg-accent text-brand-green shadow-glow' 
                        : (isDark ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-black/5 text-primary/60 hover:bg-black/10')
                    }`}
                  >
                    {mode === 'system' ? 'Auto' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
         </Section>

         <Section title="Settings" isDark={isDark}>
            <Row icon="notifications" label="Notifications" toggle isDark={isDark} />
            <Row icon="lock" label="Privacy" arrow isDark={isDark} />
         </Section>

         <button onClick={() => { logout(); navigate('/login'); }} className={`w-full py-4 rounded-xl text-red-400 font-bold text-sm transition-colors ${isDark ? 'glass-button hover:bg-red-500/10' : 'bg-white border border-black/5 hover:bg-red-50'}`}>
            Sign Out
         </button>
      </div>

      {/* Guest Check-In Modal */}
      <HubSpotFormModal
        isOpen={showGuestCheckin}
        onClose={() => setShowGuestCheckin(false)}
        formType="guest-checkin"
        title="Guest Check-In"
        subtitle="Register your guest for today's visit."
        fields={GUEST_CHECKIN_FIELDS}
        submitButtonText="Check In Guest"
        additionalFields={{
          member_name: user.name,
          member_email: user.email
        }}
        onSuccess={async () => {
          try {
            const res = await fetch(`/api/guest-passes/${encodeURIComponent(user.email)}?tier=${encodeURIComponent(user.tier || 'Social')}`);
            const data = await res.json();
            setGuestPasses(data);
          } catch (err) {
            console.error('Error refreshing guest passes:', err);
          }
        }}
      />

      {/* Full Screen Card Modal */}
      {isCardOpen && (
         <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="w-full max-w-sm aspect-[1/1.4] bg-[#1c1c1e] rounded-[2rem] relative overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-500">
                {/* Header Section of Pass */}
                <div className="bg-[#2c2c2e] p-6 pb-4">
                    <div className="flex justify-between items-center mb-6">
                         <img src="/assets/logos/monogram-white.png" className="w-10 h-10" alt="" />
                         <span className="font-bold text-lg tracking-wide">Even House</span>
                    </div>
                </div>
                
                {/* Body */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-b from-[#2c2c2e] to-[#1c1c1e]">
                    <div className="w-48 h-48 bg-white rounded-2xl p-2 flex items-center justify-center">
                        <span className="material-symbols-outlined text-9xl text-black">qr_code_2</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
                        <p className="text-white/50 text-sm uppercase tracking-widest">{user.tier} Member</p>
                    </div>
                </div>

                <button onClick={() => setIsCardOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
            <button className="mt-8 px-8 py-3 bg-white text-black rounded-full font-bold shadow-glow" onClick={() => alert("Added to Wallet")}>
                Add to Apple Wallet
            </button>
         </div>
      )}
    </div>
  );
};

const Section: React.FC<{title: string; children: React.ReactNode; isDark?: boolean}> = ({ title, children, isDark = true }) => (
  <div>
     <h3 className={`text-xs font-bold uppercase tracking-wider ml-2 mb-3 ${isDark ? 'opacity-50' : 'text-primary/50'}`}>{title}</h3>
     <div className={`rounded-2xl overflow-hidden ${isDark ? 'glass-card divide-y divide-white/5' : 'bg-white border border-black/5 shadow-sm divide-y divide-black/5'}`}>
        {children}
     </div>
  </div>
);

const Row: React.FC<{icon: string; label: string; value?: string; toggle?: boolean; arrow?: boolean; isDark?: boolean}> = ({ icon, label, value, toggle, arrow, isDark = true }) => (
   <div className={`p-4 flex items-center justify-between transition-colors cursor-pointer ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
      <div className="flex items-center gap-4">
         <span className={`material-symbols-outlined ${isDark ? 'opacity-70' : 'text-primary/70'}`}>{icon}</span>
         <span className={`font-medium text-sm ${isDark ? '' : 'text-primary'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
         {value && <span className={`text-sm ${isDark ? 'opacity-50' : 'text-primary/50'}`}>{value}</span>}
         {toggle && (
            <div className="w-10 h-6 bg-green-500 rounded-full relative">
               <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
         )}
         {arrow && <span className={`material-symbols-outlined text-sm ${isDark ? 'opacity-40' : 'text-primary/40'}`}>arrow_forward_ios</span>}
      </div>
   </div>
);

export default Profile;
