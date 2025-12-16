import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#F2F2EC] min-h-screen pb-0">
      {/* Hero Section */}
      <div className="relative h-[85vh] flex flex-col justify-end p-6 pb-16 overflow-hidden rounded-b-[2.5rem] shadow-sm">
        {/* Hero Background Image - Updated to premium interior */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2661&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        
        <div className="relative z-10 animate-pop-in flex flex-col items-center text-center">
          <h1 className="text-5xl font-bold tracking-tight leading-[1.1] mb-6 text-white text-shadow-sm">
            A new kind of <br/> members club — <br/> rooted in golf, built <br/> for community.
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs mb-10 font-medium">
            Even House combines TrackMan golf simulators, cowork space, wellness classes, and curated events in one members club.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
             <button onClick={() => navigate('/membership')} className="w-full py-4 rounded-xl bg-[#F2F2EC] text-[#293515] font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform">
                Apply for Membership
             </button>
             <button onClick={() => navigate('/contact')} className="w-full py-4 rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm text-white font-bold text-sm hover:bg-white/10 transition-colors">
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
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuB4cJv0jX_Q6g4XOR02SdveS0i0W9GBNM-0Brg1NVJqCe42zUKk7Y5m4JyWvRerLHa-wZPY2_ImoWC6NBatsFkSvQcGQqBKTHfsUyrWkJFwLQUgqycCI9Ky2odlg5EfiwrZNW0RPla61IlnFigW8JXN3Byd2z7S1T548aK5hq5VUtTpxAzcA5BqOgbEldke-6O5lq4kfkXQ7Bzvo7Tz7YMxpiA6qRtwqHejpinT_S5VKLWoybx5Dm2bm3JMgcE91Tjrri740okHaDJ7"
            icon="sports_golf"
            title="Golf all year"
            desc="4 TrackMan bays, putting course, private/group lessons"
            delay="0.1s"
          />
          <FeatureCard 
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuAzWRhzIrjwSfnj7Fn_YowoOoLnp97WiABk-tWFX-vHm9vYVgWfDHLMPoT4ZQbVU2EGAhTv-KaHV5aEOs4VcL4_wZ7ECvGSzK6fGflXG8YuTS_lK-L3gw9hcdx3rm2lxFR6Ffa1ZzLGc5KIVuV1qvgFJwnZq7ogeg1NN27FL1jDNSYSSMZv3ByuwH9pIVSQvbb-bsggfttrAXW-8nbxmxv3gjb_pN7PGcHxmy19tYOu9aVExJxUVAJ3Nen9mWcol8py-fbGO8-cN4dv"
            icon="work"
            title="Work from the club"
            desc="Luxury work spaces, conference room, wifi, cafe"
            delay="0.2s"
          />
          <FeatureCard 
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDcO6CHcRG7eZJIHoNQK3q7IDLsrPvpz5MHv8bX8jsBdNpsrxUiVfvcNGutkJAL4hMb54BloTAH3eeQmu1TbSozitCeIgwKamQ2EwxE0-gxx5YtGEyK8JPgdrf5tqRGPw5CuItiduF2BHgbMw-lIExEMD6cFGpbrnGajYHH_Qh1ZzYBPqat4BAeK0EzQ6GNIevs51s15awVavnoti78WHg7qQnjjV40ePXBucxKQ2s2YyT638bkMaDOhlvcDDTcfLNPRKVOjCgmSBMD"
            icon="spa"
            title="Wellness & classes"
            desc="Med spa, fitness, yoga, recovery options"
            delay="0.3s"
          />
          <FeatureCard 
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuCrOquG_r7TmoaNda1akCtAZSL5euiwkQMkDzJHxsHljXdgNZ_sBlG5vQHxiUJu7Z5Ggf6vk0VtUBmXa2q1F7nKVB2YVodDjaCaveowpkDEzzuDMsRyHwqsb-nJjiEpd7faaiSrnEEQxI86oPFK5h-LZpmn7uURvYYshSQHG7ovgIFayEAaUGvQOPnPoyqgadHO4bezO7IEbYqLcuAD_1CI6gRpfkYadehp_O4sQlGJRPFaFW3WTZqNvnlS5l7Wmbx6J9IB28YlSXm-"
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
         </div>
      </div>

      {/* Private Events Inquiry Section */}
      <div className="px-4 pb-12">
         <div className="relative rounded-[2rem] overflow-hidden h-[400px] group">
            <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCUuPWF3ePM-tEnxyYsghH7Vc-n7DOoCfQJ__3NR3QAowrsuiL8Sv3aiqoq1IPoxSq5Y5yCdXiqV_aOdxFMe7DD9MxQLYRP3fkXynSRaPHFmpgYcg6lqNiyRCc6pfMzdNzVE3y5vVDHUf-dlwsqdC8nmEu6MpDifwOgq2g50rPb9ZT_pIOvlcRC8dTj_rr7aAvQXHYPLwB4uFxrNn7sJecijD9ZLumsRkTyM--OCWV9O5cAImV52Cbyv6PVLIoWgMhG4Jjq_nsM9C_D')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"></div>
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

export const Footer: React.FC = () => (
  <footer className="bg-[#293515] text-[#E7E7DC] py-16 px-6 text-center rounded-t-[2.5rem] mt-4">
     <div className="font-serif italic text-3xl mb-8">Even House</div>
     
     <div className="space-y-6 text-sm font-medium mb-10">
        <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-2 text-[#E7E7DC]">
                <span className="material-symbols-outlined text-lg">location_on</span>
                <p>15771 Red Hill Ave, Ste 500</p>
            </div>
            <p className="text-[#E7E7DC]/70 text-xs">Tustin, CA 92780</p>
        </div>

        <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">call</span>
            <a href="tel:9495455855" className="hover:underline">(949) 545-5855</a>
        </div>

        <div className="flex flex-col items-center gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#E7E7DC]">
                <span className="material-symbols-outlined text-lg">schedule</span>
                <span className="font-bold uppercase tracking-wider">Hours</span>
            </div>
            <div className="space-y-1 text-[#E7E7DC]/70">
                <p>Mon: Closed</p>
                <p>Tue–Thu: 8:30 AM–8 PM</p>
                <p>Fri–Sat: 8:30 AM–10 PM</p>
                <p>Sun: 8:30 AM–6 PM</p>
            </div>
        </div>
     </div>

     <div className="flex justify-center gap-4 mb-10">
        <SocialLink href="https://www.instagram.com/evenhouseclub/" label="IG" />
        <SocialLink href="https://www.linkedin.com/company/even-house" label="IN" />
        <SocialLink href="https://www.tiktok.com/@evenhouseclub" label="TT" />
     </div>
     
     <div className="w-full h-px bg-[#E7E7DC]/10 mb-8"></div>
     
     <div className="flex flex-col gap-2">
        <a href="https://evenhouse.club" target="_blank" className="text-[10px] opacity-40 hover:opacity-100 transition-opacity">evenhouse.club</a>
        <p className="text-[10px] opacity-40">© 2024 Even House. All rights reserved.</p>
     </div>
  </footer>
);

const SocialLink: React.FC<{href: string; label: string}> = ({ href, label }) => (
    <a href={href} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-[#E7E7DC]/20 flex items-center justify-center font-bold text-[10px] hover:bg-[#E7E7DC] hover:text-[#293515] transition-colors cursor-pointer text-[#E7E7DC]">
        {label}
    </a>
);

export default Landing;