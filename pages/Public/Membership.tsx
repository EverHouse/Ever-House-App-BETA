import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Footer } from './Landing';

const Membership: React.FC = () => {
  return (
    <Routes>
      <Route index element={<MembershipOverview />} />
      <Route path="compare" element={<CompareFeatures />} />
      <Route path="corporate" element={<Corporate />} />
    </Routes>
  );
};

const MembershipOverview: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPass, setSelectedPass] = useState<'workspace' | 'sim' | null>(null);

  return (
    <div className="px-4 pt-6 pb-12 flex flex-col gap-8 bg-[#F2F2EC]">
      <div className="text-center px-2">
        <h2 className="text-3xl font-bold tracking-tight text-primary mb-3">Membership Overview</h2>
        <p className="text-primary/70 text-base leading-relaxed max-w-[320px] mx-auto">
          A space for connection and growth. Select the membership that fits your lifestyle.
        </p>
      </div>

      {/* Guest Pass Section */}
      <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
           <div className="p-2 bg-primary/5 rounded-lg text-primary">
              <span className="material-symbols-outlined">id_card</span>
           </div>
           <div>
              <h3 className="font-bold text-lg text-primary">Day Passes</h3>
              <p className="text-xs text-primary/60">Experience the club for a day.</p>
           </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
           <button 
             onClick={() => setSelectedPass('workspace')}
             className={`flex flex-col gap-2 p-3 rounded-xl border transition-all text-left group ${selectedPass === 'workspace' ? 'bg-primary text-white border-primary shadow-md' : 'bg-transparent border-black/10 hover:border-black/20 text-primary'}`}
           >
              <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${selectedPass === 'workspace' ? 'text-white' : 'text-primary'}`}>work</span>
              <div>
                 <p className="font-bold text-sm">Workspace</p>
                 <p className={`text-xs ${selectedPass === 'workspace' ? 'text-white/80' : 'text-primary/60'}`}>$25 / day</p>
              </div>
           </button>
           <button 
             onClick={() => setSelectedPass('sim')}
             className={`flex flex-col gap-2 p-3 rounded-xl border transition-all text-left group ${selectedPass === 'sim' ? 'bg-primary text-white border-primary shadow-md' : 'bg-transparent border-black/10 hover:border-black/20 text-primary'}`}
           >
              <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${selectedPass === 'sim' ? 'text-white' : 'text-primary'}`}>sports_golf</span>
              <div>
                 <p className="font-bold text-sm">Golf Sim</p>
                 <p className={`text-xs ${selectedPass === 'sim' ? 'text-white/80' : 'text-primary/60'}`}>$50 / 60min</p>
              </div>
           </button>
        </div>
        <button 
            onClick={() => navigate('/contact')}
            className="w-full mt-4 py-3 text-sm font-bold text-primary border-t border-black/5 hover:bg-black/5 transition-colors rounded-b-xl -mb-2"
        >
           Request a Pass
        </button>
      </div>

      <div className="flex flex-col gap-5">
        <MembershipCard 
          title="Social Membership"
          price="$180"
          desc="Perfect for those who want to join the community and enjoy the club’s lifestyle offerings, without the golf simulators."
          features={[
            "Lounges, Café & Work spaces",
            "Putting course & Practice green",
            "Member events",
            "Daily guest passes",
            "Concierge for bookings"
          ]}
          onClick={() => navigate('/contact')} 
        />
        <MembershipCard 
          title="Core Membership"
          price="$250"
          desc="Your all-access pass to the Even House experience."
          features={[
            "Café, Lounges, Putting course",
            "60 mins/day Golf Simulators",
            "60 mins/day Conf Room",
            "Daily guest passes",
            "Concierge for bookings & support"
          ]}
          onClick={() => navigate('/contact')}
        />
        {/* Premium Card - Dark Green */}
        <div className="relative flex flex-col p-6 bg-primary rounded-2xl shadow-xl border border-white/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="pr-2">
              <h3 className="text-xl font-extrabold text-white mb-2">Premium Membership</h3>
              <p className="text-sm text-white/70 leading-snug">Gives you everything from the Core Membership plus priority bookings.</p>
            </div>
            <span className="shrink-0 px-3 py-1 bg-accent text-primary text-xs font-bold rounded-full uppercase tracking-wider shadow-sm mt-1">
              Popular
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-6 relative z-10">
            <span className="text-4xl font-bold text-white tracking-tight">$450</span>
            <span className="text-sm font-medium text-white/60">/mo</span>
          </div>
          <ul className="flex flex-col gap-3 mb-8 relative z-10">
            {[
              "Everything from Core",
              "90 mins/day Golf Simulator",
              "Priority booking of amenities",
              "Group lessons package",
              "Daily comp. coffee/beer/wine"
            ].map((f, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/90">
                <span className="material-symbols-outlined text-[20px] text-accent shrink-0">check_circle</span>
                <span className={i === 0 ? "font-bold" : ""}>{f}</span>
              </li>
            ))}
          </ul>
          <button 
            onClick={() => navigate('/contact')}
            className="w-full relative z-10 py-3.5 px-6 rounded-xl bg-white text-primary font-bold text-sm tracking-wide hover:scale-[1.02] transition-transform active:scale-[0.98] shadow-md"
          >
            Apply
          </button>
        </div>

        <MembershipCard 
          title="Corporate Membership"
          price="$350"
          suffix="/mo per employee"
          desc="Unlock a powerful business asset."
          features={[
            "Daily workspaces & lounge",
            "90 min/day Golf Simulator",
            "Priority bookings",
            "15 full-access guest passes/yr"
          ]}
          onClick={() => navigate('corporate')}
          btnText="View Details"
        />
      </div>
      
      <div className="text-center mt-2">
        <button onClick={() => navigate('compare')} className="inline-flex items-center gap-1 text-sm font-semibold text-primary/70 hover:text-primary transition-colors">
          Compare full feature table
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>

      <Footer />
    </div>
  );
};

const MembershipCard: React.FC<any> = ({ title, price, suffix="/mo", desc, features, onClick, btnText="Apply" }) => (
  <div className="relative flex flex-col p-6 bg-white rounded-2xl shadow-sm border border-black/5 hover:border-black/10 transition-all duration-300">
    <div className="mb-4">
      <h3 className="text-xl font-extrabold text-primary mb-2">{title}</h3>
      <p className="text-sm text-primary/70 leading-snug">{desc}</p>
    </div>
    <div className="flex items-baseline gap-1 mb-6">
      <span className="text-4xl font-bold text-primary tracking-tight">{price}</span>
      <span className="text-sm font-medium text-primary/60">{suffix}</span>
    </div>
    <ul className="flex flex-col gap-3 mb-8">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex gap-3 text-sm text-primary/80">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0">check_circle</span>
          <span className={i===0 && f.includes("Caf") ? "font-bold" : ""}>{f}</span>
        </li>
      ))}
    </ul>
    <button onClick={onClick} className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-transform active:scale-[0.98] shadow-lg">
      {btnText}
    </button>
  </div>
);

const Corporate: React.FC = () => {
    const navigate = useNavigate();
    return (
      <div className="px-6 pt-6 pb-12 flex flex-col gap-6 bg-[#F2F2EC] min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2">
                <span className="px-4 py-1 bg-white text-primary text-xs font-bold rounded-full uppercase tracking-wider border border-black/5 shadow-sm">
                    For the team
                </span>
            </div>
            <h1 className="text-[36px] font-bold tracking-tight text-primary leading-[1.1] mt-4">
                Corporate <br/>Membership
            </h1>
            <p className="text-primary/70 text-base leading-relaxed max-w-xs mt-2">
                A unified space for your team to connect, create, and grow together.
            </p>
        </div>

        {/* Features Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
            <ul className="space-y-8">
                <li className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-[#E8E8E0] flex items-center justify-center shrink-0">
                         <span className="material-symbols-outlined text-lg text-primary">verified</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary text-xl leading-tight mb-1">Baseline Features</h3>
                    </div>
                </li>
                <li className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shrink-0 shadow-sm">
                         <span className="material-symbols-outlined text-lg text-primary">diamond</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary text-lg leading-tight mb-2">Full Premium Experience</h3>
                        <p className="text-sm text-primary/60 leading-relaxed">Includes every benefit of the Premium tier: Private office priority, concierge, and exclusive dinner access.</p>
                        <span className="inline-block mt-3 px-3 py-1 bg-[#F2F2EC] text-[10px] font-bold uppercase tracking-wider text-primary/60 rounded border border-black/5">Excludes Drink Credit</span>
                    </div>
                </li>
                 <li className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center shrink-0 shadow-sm">
                         <span className="material-symbols-outlined text-lg text-primary">confirmation_number</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary text-lg leading-tight mb-2">15 Annual Guest Passes</h3>
                        <p className="text-sm text-primary/60 leading-relaxed">Bring clients or partners anytime. After 15 passes, guests are just $25/visit.</p>
                    </div>
                </li>
            </ul>
        </div>

        {/* Volume Discounts Table */}
        <div className="bg-[#F2F2EC] mt-4">
             <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-2xl font-bold text-primary">Volume Discounts</h2>
                <span className="px-3 py-1 bg-white rounded-full border border-black/5 text-[10px] font-bold text-primary/60 uppercase tracking-wider">Per employee / mo</span>
             </div>
             
             <div className="bg-[#F2F2EC] rounded-[2rem] border border-white shadow-sm overflow-hidden divide-y divide-[#E8E8E0]">
                <DiscountRow count="1–4" price="$350" icon="1+" />
                <DiscountRow count="5–9" price="$325" icon="5+" />
                <DiscountRow count="10–19" price="$299" icon="10+" />
                <DiscountRow count="20–49" price="$275" icon="20+" />
                <DiscountRow count="50+" price="$249" icon="50+" />
             </div>
             <p className="text-center text-[10px] text-primary/40 mt-6 px-8 leading-relaxed max-w-xs mx-auto">
                 Prices listed are per employee, billed monthly. Minimum contract terms may apply.
             </p>
        </div>

        {/* Apply Button */}
        <button onClick={() => navigate('/contact')} className="w-full py-5 px-6 rounded-2xl bg-primary text-white font-bold text-lg tracking-wide hover:bg-primary/90 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-4 mb-8 group">
            Apply for Corporate Membership
            <span className="material-symbols-outlined text-[24px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </button>
      </div>
    );
};

const DiscountRow: React.FC<{count: string; price: string; icon: string}> = ({ count, price, icon }) => (
    <div className="flex items-center justify-between p-5 bg-[#F2F2EC] hover:bg-white transition-colors group">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E8E8E0] group-hover:border-primary/10 group-hover:scale-105 transition-all">
                <span className="text-xs font-bold text-primary/70">{icon}</span>
            </div>
            <span className="font-medium text-primary text-lg">{count} employees</span>
        </div>
        <span className="font-bold text-primary text-xl tracking-tight">{price}</span>
    </div>
);

// ... (Rest of Membership.tsx: CompareFeatures, etc. - kept as is but hidden for brevity if not changed)
// Assuming CompareFeatures is needed, I'll include a placeholder or keep existing if the user didn't ask to change it. 
// For safety, I will include the existing CompareFeatures to ensure file integrity.

const MEMBERSHIP_DATA: Record<string, {
    price: string,
    features: Record<string, string | boolean>
}> = {
    Social: {
        price: "$180",
        features: {
            "Lounges & Café": true,
            "Work Spaces": true,
            "Putting Course": true,
            "Conf Room": "—",
            "Golf Simulators": false,
            "Daily Allowance": "—",
            "Booking Priority": "—",
            "Guests": "Daily"
        }
    },
    Core: {
        price: "$250",
        features: {
            "Lounges & Café": true,
            "Work Spaces": true,
            "Putting Course": true,
            "Conf Room": "60m",
            "Golf Simulators": true,
            "Daily Allowance": "60m",
            "Booking Priority": "Std",
            "Guests": "Daily"
        }
    },
    Premium: {
        price: "$450",
        features: {
            "Lounges & Café": true,
            "Work Spaces": true,
            "Putting Course": true,
            "Conf Room": "Prio",
            "Golf Simulators": true,
            "Daily Allowance": "90m",
            "Booking Priority": "High",
            "Guests": "Unlim"
        }
    },
    Corporate: {
        price: "$350",
        features: {
            "Lounges & Café": true,
            "Work Spaces": "Ded.",
            "Putting Course": true,
            "Conf Room": "Prio",
            "Golf Simulators": true,
            "Daily Allowance": "90m",
            "Booking Priority": "High",
            "Guests": "15/yr"
        }
    }
};

const FEATURE_KEYS = [
    "Lounges & Café",
    "Work Spaces",
    "Putting Course",
    "Conf Room",
    "Golf Simulators",
    "Daily Allowance",
    "Booking Priority",
    "Guests"
];

const CompareFeatures: React.FC = () => {
  const [selectedTiers, setSelectedTiers] = useState<string[]>(['Social', 'Core', 'Premium']);
  const toggleTier = (tier: string) => {
    if (selectedTiers.includes(tier)) {
        if (selectedTiers.length > 1) {
            setSelectedTiers(prev => prev.filter(t => t !== tier));
        }
    } else {
        if (selectedTiers.length < 3) {
            setSelectedTiers(prev => [...prev, tier]);
        }
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-6 px-4 pb-12 bg-[#F2F2EC] min-h-screen">
       <div className="text-center px-2">
        <h2 className="text-3xl font-bold tracking-tight text-primary mb-3">Compare Features</h2>
        <p className="text-primary/70 text-base leading-relaxed max-w-[320px] mx-auto">
          Select up to 3 memberships to compare side-by-side.
        </p>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Select to Compare (Max 3)</h3>
        <div className="flex flex-wrap gap-2">
          {['Social', 'Core', 'Premium', 'Corporate'].map(t => {
            const isSelected = selectedTiers.includes(t);
            return (
                <button 
                    key={t} 
                    onClick={() => toggleTier(t)}
                    disabled={!isSelected && selectedTiers.length >= 3}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1 transition-all ${isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-transparent text-primary/60 border-black/10 hover:border-black/20'} ${!isSelected && selectedTiers.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>} {t}
                </button>
            )
          })}
        </div>
      </div>

      <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-black/5 overflow-x-auto">
        <div className="min-w-[300px]">
          <div className="grid grid-cols-[25%_1fr_1fr_1fr] gap-1 mb-4 border-b border-black/5 pb-4 items-end">
             <div className="text-[10px] font-bold text-primary/40 uppercase tracking-widest pl-1">Features</div>
             {selectedTiers.map((tier, idx) => (
                 <div key={tier} className="text-center px-0.5">
                    {tier === 'Core' && <div className="inline-block bg-accent text-[8px] font-bold px-1.5 py-0.5 rounded-full text-primary mb-1">POPULAR</div>}
                    <span className="text-xs md:text-sm font-bold block text-primary truncate">{tier}</span>
                    <span className="text-[10px] text-primary/60">{MEMBERSHIP_DATA[tier].price}</span>
                 </div>
             ))}
             {[...Array(3 - selectedTiers.length)].map((_, i) => <div key={i}></div>)}
          </div>
          
          {FEATURE_KEYS.map(feature => (
              <div key={feature} className="grid grid-cols-[25%_1fr_1fr_1fr] gap-1 items-center py-2.5 border-b border-black/5 last:border-0">
                  <div className="text-[10px] font-bold text-primary pl-1 leading-tight">{feature}</div>
                  {selectedTiers.map(tier => {
                      const val = MEMBERSHIP_DATA[tier].features[feature];
                      return (
                        <div key={`${tier}-${feature}`} className="flex justify-center text-center">
                            {val === true ? (
                                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                            ) : val === false ? (
                                <span className="text-[10px] font-bold text-primary/30">—</span>
                            ) : (
                                <span className="text-[10px] font-bold text-primary leading-tight">{val}</span>
                            )}
                        </div>
                      );
                  })}
                  {[...Array(3 - selectedTiers.length)].map((_, i) => <div key={i}></div>)}
              </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Membership;