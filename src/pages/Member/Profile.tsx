import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isFoundingMember, getBaseTier } from '../../utils/permissions';
import { getTierColor } from '../../utils/tierUtils';
import { useTierPermissions } from '../../hooks/useTierPermissions';
import TierBadge from '../../components/TierBadge';
import TagBadge from '../../components/TagBadge';
import HubSpotFormModal from '../../components/HubSpotFormModal';
import { isPushSupported, isSubscribedToPush, subscribeToPush, unsubscribeFromPush } from '../../services/pushNotifications';
import Toggle from '../../components/Toggle';


const GUEST_CHECKIN_FIELDS = [
  { name: 'guest_firstname', label: 'Guest First Name', type: 'text' as const, required: true, placeholder: 'John' },
  { name: 'guest_lastname', label: 'Guest Last Name', type: 'text' as const, required: true, placeholder: 'Smith' },
  { name: 'guest_email', label: 'Guest Email', type: 'email' as const, required: true, placeholder: 'john@example.com' },
  { name: 'guest_phone', label: 'Guest Phone', type: 'tel' as const, required: false, placeholder: '(555) 123-4567' }
];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, actualUser, isViewingAs } = useData();
  const { themeMode, setThemeMode, effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [showGuestCheckin, setShowGuestCheckin] = useState(false);
  const [guestPasses, setGuestPasses] = useState<{ passes_used: number; passes_total: number; passes_remaining: number } | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Check if viewing a staff/admin profile (either directly or via view-as)
  const isStaffOrAdminProfile = user?.role === 'admin' || user?.role === 'staff';
  // Check if actual user is admin viewing as someone
  const isAdminViewingAs = actualUser?.role === 'admin' && isViewingAs;

  const { permissions: tierPermissions } = useTierPermissions(user?.tier);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/guest-passes/${encodeURIComponent(user.email)}?tier=${encodeURIComponent(user.tier || 'Social')}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch guest passes');
          return res.json();
        })
        .then(data => setGuestPasses(data))
        .catch(err => console.error('Error fetching guest passes:', err));
    }
  }, [user?.email, user?.tier]);

  useEffect(() => {
    const checkPush = async () => {
      const supported = await isPushSupported();
      setPushSupported(supported);
      if (supported) {
        const subscribed = await isSubscribedToPush();
        setPushEnabled(subscribed);
      }
    };
    checkPush();
  }, []);

  const handlePushToggle = async (newValue: boolean) => {
    if (!user?.email || pushLoading) return;
    
    setPushLoading(true);
    try {
      if (!newValue) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const success = await subscribeToPush(user.email);
        setPushEnabled(success);
      }
    } finally {
      setPushLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="px-6 pt-6 pb-32">
      {/* Wallet Pass Preview */}
      {(() => {
         const tierColors = getTierColor(user.tier || 'Social');
         const cardBgColor = tierColors.bg;
         const cardTextColor = tierColors.text;
         return (
            <div onClick={() => setIsCardOpen(true)} className="relative h-48 w-full rounded-[1.5rem] overflow-hidden cursor-pointer transform transition-transform active:scale-95 shadow-layered mb-8 group animate-pop-in">
               {/* Card Background */}
               <div className="absolute inset-0" style={{ backgroundColor: cardBgColor }}></div>
               {/* Gloss */}
               <div className="absolute inset-0 bg-glossy opacity-50"></div>
               {/* Content */}
               <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                     <img src="/assets/logos/monogram-white.webp" className="w-8 h-8 opacity-90" alt="" />
                     <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${cardTextColor}99` }}>Even House</span>
                        {(user.tags || []).map((tag) => (
                           <TagBadge key={tag} tag={tag} size="sm" />
                        ))}
                        {!user.tags?.length && isFoundingMember(user.tier || '', user.isFounding) && (
                           <TagBadge tag="Founding Member" size="sm" />
                        )}
                     </div>
                  </div>
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <TierBadge tier={user.tier || 'Social'} size="sm" />
                     </div>
                     <h3 className="text-xl font-bold tracking-wide" style={{ color: cardTextColor }}>{user.name}</h3>
                     {user.joinDate && (
                        <p className="text-xs mt-2" style={{ color: `${cardTextColor}80` }}>Joined {user.joinDate}</p>
                     )}
                     {user.lifetimeVisits !== undefined && (
                        <p className="text-xs" style={{ color: `${cardTextColor}80` }}>{user.lifetimeVisits} {user.lifetimeVisits === 1 ? 'golf booking' : 'golf bookings'}</p>
                     )}
                  </div>
               </div>
               {/* Tap Hint */}
               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm z-20">
                   <span className="font-bold text-sm text-white">View Membership Benefits</span>
               </div>
            </div>
         );
      })()}

      <div className="space-y-6">
         <Section title="Account" isDark={isDark}>
            <Row icon="mail" label="Email" value={user.email} isDark={isDark} />
            <Row icon="call" label="Phone" value={user.phone} isDark={isDark} />
            {user.jobTitle && <Row icon="badge" label="Role" value={user.jobTitle} isDark={isDark} />}
         </Section>

         <Section title="Settings" isDark={isDark}>
            <div className={`p-4 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
              <div className="flex items-center gap-4">
                <span className={`material-symbols-outlined ${isDark ? 'opacity-70' : 'text-primary/70'}`}>notifications</span>
                <div>
                  <span className={`font-medium text-sm ${isDark ? '' : 'text-primary'}`}>Push Notifications</span>
                  <p className={`text-xs mt-0.5 ${isDark ? 'opacity-50' : 'text-primary/50'}`}>
                    {isStaffOrAdminProfile 
                      ? 'Get notified of new booking requests' 
                      : 'Get notified when bookings are approved'}
                  </p>
                  {!pushSupported && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>
                      Not supported in this browser
                    </p>
                  )}
                </div>
              </div>
              <Toggle
                checked={pushEnabled}
                onChange={handlePushToggle}
                disabled={pushLoading || !pushSupported}
                label="Push Notifications"
              />
            </div>
            <Row icon="lock" label="Privacy" arrow isDark={isDark} />
         </Section>

         {/* Guest Passes - only show for regular members with passes */}
         {!isStaffOrAdminProfile && guestPasses && guestPasses.passes_remaining > 0 && (
           <Section title="Guest Passes" isDark={isDark}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-lg ${isDark ? 'opacity-60' : 'text-primary/60'}`}>group_add</span>
                    <span className={`text-sm ${isDark ? '' : 'text-primary'}`}>Available Passes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isDark ? 'text-accent' : 'text-brand-green'}`}>{guestPasses.passes_remaining}</span>
                    <span className={`text-xs ${isDark ? 'opacity-50' : 'text-primary/50'}`}>/ {guestPasses.passes_total}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuestCheckin(true)}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-accent/20 hover:bg-accent/30 text-accent' : 'bg-brand-green/10 hover:bg-brand-green/20 text-brand-green'}`}
                >
                  <span className="material-symbols-outlined text-lg">confirmation_number</span>
                  Check In a Guest
                </button>
              </div>
           </Section>
         )}
         
         {/* Staff Info - only show for staff/admin users */}
         {isStaffOrAdminProfile && (
           <Section title="Staff Information" isDark={isDark}>
              <Row icon="shield_person" label="Role" value={user?.role === 'admin' ? 'Administrator' : 'Staff'} isDark={isDark} />
              {user?.jobTitle && <Row icon="work" label="Position" value={user.jobTitle} isDark={isDark} />}
              <Row icon="verified" label="Portal Access" value="Staff Portal" isDark={isDark} />
           </Section>
         )}

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
                        ? 'bg-[#E7E7DC] text-[#293515] shadow-glow' 
                        : (isDark ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-black/5 text-primary/60 hover:bg-black/10')
                    }`}
                  >
                    {mode === 'system' ? 'Auto' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
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
            if (!res.ok) throw new Error('Failed to refresh guest passes');
            const data = await res.json();
            setGuestPasses(data);
          } catch (err) {
            console.error('Error refreshing guest passes:', err);
          }
        }}
      />

      {/* Full Screen Card Modal */}
      {isCardOpen && createPortal((() => {
         const tierColors = getTierColor(user.tier || 'Social');
         const cardBgColor = isStaffOrAdminProfile ? '#293515' : tierColors.bg;
         const cardTextColor = isStaffOrAdminProfile ? '#F2F2EC' : tierColors.text;
         return (
            <div className="fixed inset-0 z-[10001] overflow-y-auto">
               <div className="fixed inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200" onClick={() => setIsCardOpen(false)} />
               <div className="flex min-h-full flex-col items-center justify-center p-6 pointer-events-none">
                  <div className="w-full max-w-sm rounded-[2rem] relative overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-500 pointer-events-auto" style={{ backgroundColor: cardBgColor }}>
                   
                   {/* Close Button */}
                   <button onClick={() => setIsCardOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: `${cardTextColor}33`, color: cardTextColor }}>
                       <span className="material-symbols-outlined text-sm">close</span>
                   </button>

                   {/* Header with Logo */}
                   <div className="pt-6 pb-4 px-6 flex justify-center" style={{ backgroundColor: cardBgColor }}>
                       <img src="/assets/logos/monogram-white.webp" className="w-12 h-12" alt="" />
                   </div>
                   
                   {/* Member Info */}
                   <div className="px-6 pb-6 text-center" style={{ backgroundColor: cardBgColor }}>
                       <h2 className="text-2xl font-bold mb-3" style={{ color: cardTextColor }}>{user.name}</h2>
                       
                       {isStaffOrAdminProfile ? (
                         <>
                           <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                              <span className="px-3 py-1 rounded-full bg-white/20 text-sm font-bold" style={{ color: cardTextColor }}>
                                 {user.role === 'admin' ? 'Administrator' : 'Staff'}
                              </span>
                           </div>
                           {user.jobTitle && (
                             <p className="text-sm opacity-80" style={{ color: cardTextColor }}>{user.jobTitle}</p>
                           )}
                         </>
                       ) : (
                         <>
                           <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                              <TierBadge tier={user.tier || 'Social'} size="md" />
                           </div>
                           {((user.tags || []).length > 0 || isFoundingMember(user.tier || '', user.isFounding)) && (
                             <div className="flex items-center justify-center gap-2 flex-wrap">
                                {(user.tags || []).map((tag) => (
                                   <TagBadge key={tag} tag={tag} size="sm" />
                                ))}
                                {!user.tags?.length && isFoundingMember(user.tier || '', user.isFounding) && (
                                   <TagBadge tag="Founding Member" size="sm" />
                                )}
                             </div>
                           )}
                         </>
                       )}
                   </div>

                   {/* Benefits Section - Members Only */}
                   {!isStaffOrAdminProfile && (
                     <div className="px-6 pb-6" style={{ backgroundColor: cardBgColor }}>
                       <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: `${cardTextColor}10` }}>
                         <h3 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-3" style={{ color: cardTextColor }}>Membership Benefits</h3>
                         
                         {user.joinDate && (
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>event</span>
                               <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Member Since</span>
                             </div>
                             <span className="text-sm font-semibold" style={{ color: cardTextColor }}>{user.joinDate}</span>
                           </div>
                         )}
                         
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>calendar_month</span>
                             <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Advance Booking</span>
                           </div>
                           <span className="text-sm font-semibold" style={{ color: cardTextColor }}>
                             {tierPermissions.unlimitedAccess ? 'Unlimited' : `${tierPermissions.advanceBookingDays} days`}
                           </span>
                         </div>
                         
                         {tierPermissions.canBookSimulators && (
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>sports_golf</span>
                               <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Daily Sim Time</span>
                             </div>
                             <span className="text-sm font-semibold" style={{ color: cardTextColor }}>
                               {tierPermissions.unlimitedAccess ? 'Unlimited' : `${tierPermissions.dailySimulatorMinutes} min`}
                             </span>
                           </div>
                         )}
                         
                         {guestPasses && (
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>group_add</span>
                               <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Guest Passes</span>
                             </div>
                             <span className="text-sm font-semibold" style={{ color: cardTextColor }}>
                               {guestPasses.passes_remaining} / {guestPasses.passes_total}
                             </span>
                           </div>
                         )}

                         {user.mindbodyClientId && (
                           <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: `1px solid ${cardTextColor}20` }}>
                             <div className="flex items-center gap-3">
                               <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>badge</span>
                               <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Mindbody ID</span>
                             </div>
                             <span className="text-sm font-mono font-semibold" style={{ color: cardTextColor }}>{user.mindbodyClientId}</span>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* Staff Portal Access */}
                   {isStaffOrAdminProfile && (
                     <div className="px-6 pb-6" style={{ backgroundColor: cardBgColor }}>
                       <div className="rounded-xl p-4 text-center" style={{ backgroundColor: `${cardTextColor}10` }}>
                         <span className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: cardTextColor }}>Portal Access</span>
                         <p className="text-lg font-bold mt-1" style={{ color: cardTextColor }}>Staff Portal</p>
                       </div>
                     </div>
                   )}
                  </div>

                  {/* Wallet Button - Members Only */}
                  {!isStaffOrAdminProfile && (
                    <button className="mt-6 px-8 py-3 bg-white text-black rounded-full font-bold shadow-glow pointer-events-auto" onClick={() => alert("Added to Wallet")}>
                        Add to Apple Wallet
                    </button>
                  )}
               </div>
            </div>
         );
      })(), document.body)}
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
