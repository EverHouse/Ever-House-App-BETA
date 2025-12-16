import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useData();
  const [isCardOpen, setIsCardOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="px-6 pt-6 pb-24">
      <div className="flex flex-col items-center mb-8">
         <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-accent to-purple-500 mb-4 shadow-glow">
            <img src={user.avatar || "https://i.pravatar.cc/300"} className="w-full h-full rounded-full object-cover border-4 border-[#0f172a]" alt="Profile" />
         </div>
         <h1 className="text-2xl font-bold">{user.name}</h1>
         <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-md glass-button text-[10px] font-bold uppercase tracking-wider">{user.tier} Member</span>
            <span className="text-xs opacity-50">#{user.id}</span>
         </div>
      </div>

      {/* Wallet Pass Preview */}
      <div onClick={() => setIsCardOpen(true)} className="relative h-48 w-full rounded-[1.5rem] overflow-hidden cursor-pointer transform transition-transform active:scale-95 shadow-2xl mb-8 group">
         {/* Card Background */}
         <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e]"></div>
         {/* Gloss */}
         <div className="absolute inset-0 bg-glossy opacity-50"></div>
         {/* Content */}
         <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
               <img src="/assets/logos/monogram-white.png" className="w-8 h-8 opacity-90" alt="" />
               <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Even House</span>
            </div>
            <div>
               <p className="text-xs opacity-60 uppercase tracking-wider mb-1">Member</p>
               <h3 className="text-xl font-bold tracking-wide text-shadow">{user.name}</h3>
            </div>
         </div>
         {/* Tap Hint */}
         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
             <span className="font-bold text-sm">Tap to View</span>
         </div>
      </div>

      <div className="space-y-6">
         <Section title="Account">
            <Row icon="mail" label="Email" value={user.email} />
            <Row icon="call" label="Phone" value={user.phone} />
         </Section>

         <Section title="Settings">
            <Row icon="notifications" label="Notifications" toggle />
            <Row icon="lock" label="Privacy" arrow />
         </Section>

         <button onClick={() => { logout(); navigate('/login'); }} className="w-full py-4 glass-button rounded-xl text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors">
            Sign Out
         </button>
      </div>

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

const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
  <div>
     <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 ml-2 mb-3">{title}</h3>
     <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
        {children}
     </div>
  </div>
);

const Row: React.FC<{icon: string; label: string; value?: string; toggle?: boolean; arrow?: boolean}> = ({ icon, label, value, toggle, arrow }) => (
   <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
      <div className="flex items-center gap-4">
         <span className="material-symbols-outlined opacity-70">{icon}</span>
         <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
         {value && <span className="text-sm opacity-50">{value}</span>}
         {toggle && (
            <div className="w-10 h-6 bg-green-500 rounded-full relative">
               <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
         )}
         {arrow && <span className="material-symbols-outlined text-sm opacity-40">arrow_forward_ios</span>}
      </div>
   </div>
);

export default Profile;