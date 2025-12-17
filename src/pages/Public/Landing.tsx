import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import HubSpotFormModal from '../../components/HubSpotFormModal';

const TOUR_REQUEST_FIELDS = [
  { name: 'firstname', label: 'First Name', type: 'text' as const, required: true, placeholder: 'Jane' },
  { name: 'lastname', label: 'Last Name', type: 'text' as const, required: true, placeholder: 'Doe' },
  { name: 'email', label: 'Email', type: 'email' as const, required: true, placeholder: 'jane@example.com' },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: false, placeholder: '(949) 555-0100' },
  { name: 'visit_type', label: 'Type of Visit', type: 'select' as const, required: true, options: ['Personal Tour', 'Group Tour', 'Membership Inquiry', 'Other'] },
  { name: 'message', label: 'Preferred Date/Time', type: 'textarea' as const, required: false, placeholder: 'Let us know when you\'d like to visit...' }
];

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [showTourForm, setShowTourForm] = useState(false);

  return (
    <div className="bg-[#F2F2EC] min-h-screen pb-0 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative h-[85vh] flex flex-col justify-end p-6 pb-16 overflow-hidden rounded-b-[2.5rem] shadow-sm">
        {/* Hero Background Image - Even House interior lounge */}
        <div className="absolute inset-0 bg-[url('/images/hero-lounge.jpg')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        
        <div className="relative z-10 animate-pop-in flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6 text-white text-shadow-sm">
            A new kind of <br/> members club — <br/> rooted in golf, built <br/> for community.
          </h1>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xs sm:max-w-sm mb-8 sm:mb-10 font-medium">
            Even House combines TrackMan golf simulators, cowork space, wellness classes, and curated events in one members club.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
             <button onClick={() => navigate('/membership')} className="w-full py-4 rounded-xl bg-[#F2F2EC] text-[#293515] font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform">
                Apply for Membership
             </button>
             <button onClick={() => setShowTourForm(true)} className="w-full py-4 rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm text-white font-bold text-sm hover:bg-white/10 transition-colors">
                Book a Tour
             </button>
          </div>
        </div>
      </div>

      {/* Features Section - "Why Even House" (Moved to First Position) */}
      <div className="px-6 py-12">
        <h2 className="text-3xl font-bold text-[#293515] mb-8 font-sans">Why Even House</h2>
        <div className="grid grid-cols-2 gap-4">
          <FeatureCard 
            image="/images/golf-sims.jpg"
            icon="sports_golf"
            title="Golf all year"
            desc="4 TrackMan bays, putting course, private/group lessons"
            delay="0.1s"
          />
          <FeatureCard 
            image="/images/cowork.jpg"
            icon="work"
            title="Work from the club"
            desc="Luxury work spaces, conference room, wifi, cafe"
            delay="0.2s"
          />
          <FeatureCard 
            image="/images/wellness-yoga.jpg"
            icon="spa"
            title="Wellness & classes"
            desc="Med spa, fitness, yoga, recovery options"
            delay="0.3s"
          />
          <FeatureCard 
            image="/images/events-crowd.jpg"
            icon="groups"
            title="Events & community"
            desc="Member events, watch parties, mixers"
            delay="0.4s"
          />
        </div>
      </div>

      {/* Membership Preview Section */}
      <div className="px-6 pb-12 bg-[#F2F2EC]">
         <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#293515] mb-2">Membership Tiers</h2>
            <p className="text-[#293515]/70 text-sm">Select the plan that fits your lifestyle.</p>
         </div>
         
         <div className="flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-[#293515]">Social</h3>
                    <span className="text-lg font-bold text-[#293515]">$180<span className="text-xs font-medium opacity-60">/mo</span></span>
                </div>
                <p className="text-sm text-[#293515]/70 mb-4">Access to lounges, café, workspace, and events.</p>
                <ul className="space-y-2 mb-6">
                    <li className="flex gap-2 text-xs font-bold text-[#293515]/80"><span className="material-symbols-outlined text-sm">check</span> Lounge & Cowork Access</li>
                    <li className="flex gap-2 text-xs font-bold text-[#293515]/80"><span className="material-symbols-outlined text-sm">check</span> Member Events</li>
                </ul>
                <button onClick={() => navigate('/membership')} className="w-full py-3 rounded-xl border border-[#293515]/10 text-[#293515] font-bold text-xs hover:bg-[#293515]/5">View Details</button>
            </div>

            <div className="bg-[#293515] p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">Core</h3>
                        <span className="bg-[#CCB8E4] text-[#293515] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Popular</span>
                    </div>
                    <span className="text-lg font-bold text-white">$250<span className="text-xs font-medium opacity-60">/mo</span></span>
                </div>
                <p className="text-sm text-white/70 mb-4 relative z-10">All-access pass including golf simulators.</p>
                <ul className="space-y-2 mb-6 relative z-10">
                    <li className="flex gap-2 text-xs font-bold text-white/90"><span className="material-symbols-outlined text-sm text-[#CCB8E4]">check</span> 60min Daily Sim Time</li>
                    <li className="flex gap-2 text-xs font-bold text-white/90"><span className="material-symbols-outlined text-sm text-[#CCB8E4]">check</span> 60min Conf Room</li>
                </ul>
                <button onClick={() => navigate('/membership')} className="w-full py-3 rounded-xl bg-white text-[#293515] font-bold text-xs hover:bg-gray-100 relative z-10">View Details</button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-[#293515]">Corporate</h3>
                    <span className="text-lg font-bold text-[#293515]">$350<span className="text-xs font-medium opacity-60">/mo</span></span>
                </div>
                <p className="text-sm text-[#293515]/70 mb-4">Elevate your team with premium amenities.</p>
                <ul className="space-y-2 mb-6">
                    <li className="flex gap-2 text-xs font-bold text-[#293515]/80"><span className="material-symbols-outlined text-sm">check</span> 90min Daily Sim Time</li>
                    <li className="flex gap-2 text-xs font-bold text-[#293515]/80"><span className="material-symbols-outlined text-sm">check</span> 10-Day Advance Booking</li>
                </ul>
                <button onClick={() => navigate('/membership/corporate')} className="w-full py-3 rounded-xl border border-[#293515]/10 text-[#293515] font-bold text-xs hover:bg-[#293515]/5">View Details</button>
            </div>

            <button onClick={() => navigate('/membership/compare')} className="w-full mt-2 flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-widest text-[#293515]/60 hover:text-[#293515] transition-colors py-2">
              Compare all tiers
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
         </div>
      </div>

      {/* Private Events Inquiry Section */}
      <div className="px-4 pb-12">
         <div className="relative rounded-[2rem] overflow-hidden h-[400px] group">
            <div className="absolute inset-0 bg-[url('/images/events-crowd.jpg')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"></div>
            <div className="absolute inset-0 bg-black/40"></div>
            <div className="absolute inset-0 p-8 flex flex-col justify-center items-center text-center">
                <span className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] mb-4">Host with Us</span>
                <h2 className="text-4xl font-bold text-white mb-6 leading-tight">Private Events &<br/>Full Buyouts</h2>
                <button onClick={() => navigate('/private-hire')} className="px-8 py-3 bg-white text-[#293515] rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg">
                    Inquire Now
                </button>
            </div>
         </div>
      </div>

      <Footer />

      <HubSpotFormModal
        isOpen={showTourForm}
        onClose={() => setShowTourForm(false)}
        formType="tour-request"
        title="Book a Tour"
        subtitle="Schedule a visit to experience Even House firsthand."
        fields={TOUR_REQUEST_FIELDS}
        submitButtonText="Request Tour"
      />
    </div>
  );
};

const FeatureCard: React.FC<{image: string; icon: string; title: string; desc: string; delay: string}> = ({ image, icon, title, desc, delay }) => (
  <div className="relative h-[240px] rounded-2xl overflow-hidden group shadow-md animate-pop-in" style={{animationDelay: delay}}>
     <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{backgroundImage: `url('${image}')`}}></div>
     <div className="absolute inset-0 bg-gradient-to-t from-[#293515]/90 via-[#293515]/40 to-transparent"></div>
     <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="mb-2">
            <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">{icon}</span>
        </div>
        <h3 className="font-bold text-white text-base leading-tight mb-1">{title}</h3>
        <p className="text-[10px] text-white/80 leading-snug">{desc}</p>
     </div>
  </div>
);

export default Landing;