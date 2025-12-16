import React from 'react';

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
        <a href="https://evenhouse.club" target="_blank" rel="noreferrer" className="text-[10px] opacity-40 hover:opacity-100 transition-opacity">evenhouse.club</a>
        <p className="text-[10px] opacity-40">© 2024 Even House. All rights reserved.</p>
     </div>
  </footer>
);

const SocialLink: React.FC<{href: string; label: string}> = ({ href, label }) => (
    <a href={href} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-[#E7E7DC]/20 flex items-center justify-center font-bold text-[10px] hover:bg-[#E7E7DC] hover:text-[#293515] transition-colors cursor-pointer text-[#E7E7DC]">
        {label}
    </a>
);

export default Footer;