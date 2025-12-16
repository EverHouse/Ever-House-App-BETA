import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from './Landing';

const WhatsOn: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#EAEBE6]">
      <section className="px-6 pt-10 pb-8 bg-[#EAEBE6] rounded-b-3xl">
        <h1 className="text-5xl font-light text-primary mb-4 tracking-tight">What's On</h1>
        <p className="text-primary/70 text-base leading-relaxed max-w-[90%]">
           Curated experiences at Even House. Join us for culture, conversation, and community in Tustin.
        </p>
      </section>

      <div className="px-4 space-y-4 pb-12 flex-1">
         
         {/* Green Card Event */}
         <div className="bg-[#EAEBE6] rounded-[2rem] p-4 pb-6">
             <div className="rounded-[1.5rem] overflow-hidden relative mb-4">
                 <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFj5KTVllgBdz8O1WrPA1eT9Xzs4o_OvSC4vVZqdHC2wZS8kA0Mod5wylBhNodT2z1EzkHDWDs7LARu6H7BOm_TPGR7AG-5MQTU2_xKN1wxn3U9jbc1yPVi7MqlGzYzfNV0qg71URDuYS7gOR_n9RkQdQpRZyiPF8a1HaZkDN6NBy4zv_P1RdxDZ4CzfE2wBzLANPrsDvOCsUzORLvEeGhjDK8MHUAo98a4-MuuoeCt8d36nl29ob-1Iq_9yt2ckUb_FxNK4wpewiu" className="w-full h-56 object-cover" alt="" />
                 <span className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary">Social</span>
             </div>
             <div className="flex justify-between items-start px-2">
                 <div>
                     <div className="flex items-center gap-2 mb-1">
                         <span className="bg-[#E2DCE6] text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Sat, June 21</span>
                         <span className="text-xs text-primary/60">7:00 PM</span>
                     </div>
                     <h3 className="text-2xl font-bold text-primary mb-2">Summer Solstice Jazz</h3>
                     <p className="text-primary/70 text-sm leading-relaxed mb-4">An evening of live jazz, curated cocktails, and seasonal bites under the stars to celebrate the longest day of the year.</p>
                     
                     <button onClick={() => navigate('/login')} className="w-full bg-[#F2F2EC] py-3 rounded-xl flex items-center justify-between px-4 hover:bg-white transition-colors">
                        <span className="text-xs font-bold text-primary">Members RSVP</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                     </button>
                 </div>
             </div>
         </div>
         
         {/* Dark Green Card Event */}
         <div className="bg-[#3a4a25] rounded-[2rem] p-6 text-white mx-2">
            <span className="inline-block bg-[#C6BED9] text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-8">Dining</span>
            
            <div className="flex flex-col items-center text-center mb-8 opacity-40">
                <span className="material-symbols-outlined text-6xl">restaurant</span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-1">Sunday Harvest Brunch</h3>
            <p className="text-white/80 text-xs font-medium mb-6">Weekly • 10:00 AM - 2:00 PM</p>
            
            <p className="text-white/70 text-sm leading-relaxed mb-6">Farm-to-table brunch featuring local Tustin produce. Open to the public with reservation.</p>

            <div className="flex gap-2">
                 <button className="flex-1 bg-[#F2F2EC] text-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                    Book a Table <span className="material-symbols-outlined text-sm">arrow_forward</span>
                 </button>
                 <span className="flex-1 flex items-center justify-center text-[10px] text-white/40 bg-white/10 rounded-xl px-2">Priority seating</span>
            </div>
         </div>

         {/* Standard Cards */}
         <ListItem 
            day="04" 
            month="JUL" 
            category="Community" 
            title="Independence Day BBQ" 
            desc="Family-friendly celebration on The Lawn. Gourmet BBQ stations, games, and music." 
            onClick={() => navigate('/login')}
        />
         <ListItem 
            day="12" 
            month="JUL" 
            category="Art" 
            title="Private Art Viewing" 
            desc="Exclusive preview of local modern art collection. Wine and cheese pairing included." 
            onClick={() => navigate('/login')}
            dark
        />
      </div>

      <Footer />
    </div>
  );
};

const ListItem: React.FC<any> = ({ day, month, category, title, desc, onClick, dark }) => (
  <article className={`group p-6 rounded-[2rem] mx-2 ${dark ? 'bg-[#293515] text-white' : 'bg-[#F2F2EC] text-primary'}`}>
     <div className="flex justify-between items-start mb-4">
        <div className={`w-16 h-20 flex-shrink-0 flex flex-col items-center justify-center rounded-xl ${dark ? 'bg-white/10 text-white' : 'bg-[#EAEBE6] text-primary'}`}>
           <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{month}</span>
           <span className="text-3xl font-light leading-none">{day}</span>
        </div>
        <span className={`px-2 py-0.5 rounded border ${dark ? 'border-white/20 text-white/60' : 'border-primary/20 text-primary/60'} text-[10px] font-bold uppercase`}>{category}</span>
     </div>
     
     <h3 className="text-xl font-bold mb-2">{title}</h3>
     <p className={`text-sm leading-relaxed mb-4 ${dark ? 'text-white/60' : 'text-primary/70'}`}>{desc}</p>
     
     <button onClick={onClick} className={`text-xs font-bold flex items-center gap-1 ${dark ? 'text-white' : 'text-primary'}`}>
        Member Login to RSVP <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
     </button>
  </article>
);

export default WhatsOn;