import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from './Landing';

const PrivateHire: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC]">
       <div className="relative w-full h-[420px] bg-primary flex flex-col justify-end overflow-hidden group rounded-b-[2rem]">
         <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
              style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCUuPWF3ePM-tEnxyYsghH7Vc-n7DOoCfQJ__3NR3QAowrsuiL8Sv3aiqoq1IPoxSq5Y5yCdXiqV_aOdxFMe7DD9MxQLYRP3fkXynSRaPHFmpgYcg6lqNiyRCc6pfMzdNzVE3y5vVDHUf-dlwsqdC8nmEu6MpDifwOgq2g50rPb9ZT_pIOvlcRC8dTj_rr7aAvQXHYPLwB4uFxrNn7sJecijD9ZLumsRkTyM--OCWV9O5cAImV52Cbyv6PVLIoWgMhG4Jjq_nsM9C_D")'}}></div>
         <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent"></div>
         <div className="relative z-10 p-6 pb-12">
            <span className="inline-block px-3 py-1 mb-3 text-[10px] font-bold tracking-widest text-white uppercase bg-white/20 backdrop-blur-sm rounded-full border border-white/10">Events</span>
            <h2 className="text-white text-5xl font-bold leading-tight tracking-tight">Host at <br/>Even House</h2>
         </div>
       </div>

       <div className="px-6 py-10">
          <h2 className="text-2xl font-bold leading-snug text-primary mb-4">Curated spaces for unforgettable moments.</h2>
          <p className="text-base font-medium leading-relaxed text-primary/70">From intimate dinners to grand receptions, discover the perfect setting for your next event at our Tustin location. Our team handles every detail so you can focus on your guests.</p>
       </div>

       <div className="px-4 pb-8 space-y-6">
          <div className="flex items-center justify-between px-2 pb-2">
             <h3 className="text-lg font-bold text-primary">Available Spaces</h3>
             <span className="text-xs font-bold text-primary/50 bg-[#E8E8E0] px-2 py-1 rounded uppercase tracking-widest">Select One</span>
          </div>
          
          <SpaceCard 
            title="The Main Hall"
            cap="150 Max"
            img="https://lh3.googleusercontent.com/aida-public/AB6AXuCF8XZt1NbdNjRHhRPmBFzYMN99aN_A6_Yt0LrZmQb_X-4KGKv-T36vuzZoKSiNeVgRr7-LEFn7rBrA1qQ_jw_PR8TZRJgKTTpHl-IdZ5eJIVzsJG9_zhXRIIpuG1wd-0GKgXvs3k2yIOzfeId1oTNPShriRJ_OaSpnz8rB0ABzRl-L0ALTm4zUfyBzzRvJtJY3IPNkVWkO8wskyDO9IoDgGC4P0AB9MEpNsavIiGPIJrmWMk1m19yqR8aLiL-vzWZaENzFaFZ5LI74"
            tags={['AV System', 'Full Bar', 'Stage']}
            desc="Our signature space featuring vaulted ceilings, abundant natural light, and a dedicated stage area."
          />
          <SpaceCard 
            title="The Private Dining Room"
            cap="20 Seated"
            img="https://lh3.googleusercontent.com/aida-public/AB6AXuCd42kNwny7mXLMILG9qpMsDTqh49VUjY93FFHTRhuHAGrvtbbD90zopQr0sMDYGZpZuo1pEUyhazHUpWDxR4tzRko0uwSCV6-X4JLdHCopIdw6RlR5pS0uT8owzy3QdBva06k_AH_id71L0b3FChUlAPiIJDil0O1rvD6UJZ0MAA8CaH9VWZZD_ENpJa8gN3dhhz47D8ru6ixXp_mRLMauxgcXomnCjEVzpUmduhA4UspMj2zJ1bMrCDDonAz4gRVwlYkHS4CqtEry"
            tags={['Private Service', 'Custom Menu']}
            desc="An exclusive enclave for business meetings or family gatherings, offering complete privacy."
          />
          <SpaceCard 
            title="The Terrace"
            cap="60 Standing"
            img="https://lh3.googleusercontent.com/aida-public/AB6AXuCCei0uMoDDGtP16sLikZ2C3lsjEf__HqKqJZLd2jlEgh9V2ew6skOuiWd9bIINAdS7OvNGH901VaRpcGOBkYdtrCCcUKZMpxyk8hmNbRHaC_1jLPnt8OSbKsI0mPtBPJq_Gh4c8d-Q2KFj86NvwygAbSjXE22DRHdNlrqiV-HRUIicNx6EFnMLNCVndH9mxk-fsI1zg4_L_RgLGYMq03q5h0XCn1z2mPf4K_rQXKbcMLozMLPEPNjNg2f2ToaRsBrGUWndxL0-kNLR"
            tags={['Outdoor Heating', 'Fire Pit']}
            desc="Enjoy the California breeze in our lush outdoor setting, perfect for cocktail hours."
          />
       </div>

       <div className="mt-4 bg-white rounded-t-[2.5rem] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-6 py-12 flex flex-col items-center text-center">
             <div className="p-3 bg-[#F2F2EC] rounded-xl mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">calendar_today</span>
             </div>
             <h3 className="text-2xl font-bold text-primary mb-3">Start your Inquiry</h3>
             <p className="text-primary/70 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
               Tell us a bit about your event and our team will get back to you with availability and pricing.
             </p>
             <div className="w-full space-y-4 mb-6 text-left">
                <Input label="Full Name" placeholder="Jane Doe" />
                <div className="grid grid-cols-2 gap-3">
                     <Input label="Date" placeholder="mm/dd/yyyy" icon="calendar_today" />
                     <Input label="Guests" placeholder="50" />
                </div>
                <Input label="Email Address" placeholder="jane@example.com" />
                <div>
                     <label className="block text-sm font-bold text-primary mb-1.5 pl-1">Message</label>
                     <textarea className="w-full bg-[#F9F9F7] border-0 rounded-lg py-3 px-4 text-primary ring-1 ring-inset ring-gray-200" rows={3} placeholder="Tell us about your event..."></textarea>
                </div>
             </div>
             <button 
                onClick={() => navigate('/private-events')} 
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
             >
                Submit Inquiry
             </button>
          </div>
       </div>
       
       <div className="bg-primary text-[#E7E7DC] py-12 px-6 text-center">
             <div className="font-serif italic text-3xl mb-6">Even House</div>
             <div className="space-y-4 text-sm font-medium">
                <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">location_on</span>
                    <p>245 El Camino Real<br/>Tustin, CA 92780</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    <p>Mon-Sat: 8am-10pm<br/>Sun: 10am-6pm</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">call</span>
                    <p>(714) 555-0123</p>
                </div>
             </div>
             <div className="flex justify-center gap-4 mt-8 text-[10px] font-bold uppercase tracking-wider">
                <span>Instagram</span>
                <span>Facebook</span>
                <span>Linkedin</span>
             </div>
             <p className="text-[10px] opacity-40 mt-8">© 2024 Even House. All rights reserved.</p>
       </div>
    </div>
  );
};

const Input: React.FC<{label: string; placeholder?: string; icon?: string}> = ({ label, placeholder, icon }) => (
    <div>
        <label className="block text-sm font-bold text-primary mb-1.5 pl-1">{label}</label>
        <div className="relative">
            <input className="w-full bg-[#F9F9F7] border-0 rounded-lg py-3 px-4 text-primary ring-1 ring-inset ring-gray-200 placeholder:text-gray-400" placeholder={placeholder} />
            {icon && (
                <span className="material-symbols-outlined absolute right-3 top-3 text-gray-400 text-lg">{icon}</span>
            )}
        </div>
    </div>
);

const SpaceCard: React.FC<any> = ({ title, cap, img, tags, desc }) => (
  <div className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] transition-all duration-300 border border-black/5">
     <div className="h-56 bg-cover bg-center" style={{backgroundImage: `url("${img}")`}}>
        <div className="absolute top-4 right-4 bg-[#6e5e48] backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
           <span className="material-symbols-outlined text-sm text-white">groups</span>
           <span className="text-[10px] font-bold text-white uppercase">{cap}</span>
        </div>
     </div>
     <div className="p-5">
        <h4 className="text-xl font-bold text-primary mb-2">{title}</h4>
        <p className="text-sm text-primary/60 mb-4 line-clamp-2 leading-relaxed">{desc}</p>
        <div className="flex flex-wrap gap-2">
           {tags.map((tag: string) => (
             <span key={tag} className="px-3 py-1 bg-[#F2F2EC] border border-black/5 rounded-full text-[10px] font-bold uppercase tracking-wide text-primary">{tag}</span>
           ))}
        </div>
     </div>
  </div>
);

export default PrivateHire;