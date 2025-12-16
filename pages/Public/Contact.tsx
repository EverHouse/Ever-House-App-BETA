import React, { useState } from 'react';
import { Footer } from './Landing';

const Contact: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
        setLoading(false);
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC]">
      <div className="px-6 pt-6 pb-6 text-center">
        <span className="font-serif font-bold text-xl tracking-tight text-primary">EH</span>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-primary mb-3">Get in Touch</h1>
        <p className="text-primary/70 text-sm leading-relaxed max-w-xs mx-auto">
           We look forward to hearing from you. Please fill out the form below or visit us in Tustin.
        </p>
      </div>

      <section className="px-4 mb-8 space-y-3">
           <ContactCard icon="location_on" title="VISIT US" value="15771 Red Hill Ave, Ste 500" />
           <ContactCard icon="call" title="CALL US" value="(949) 545-5855" href="tel:9495455855" />
           <ContactCard icon="mail" title="EMAIL US" value="hello@evenhouse.club" href="mailto:hello@evenhouse.club" />
      </section>

      <section className="px-4 mb-8">
         <div className="bg-[#E8E8E0]/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
               <span className="material-symbols-outlined text-xl">schedule</span>
               Hours of Operation
            </h3>
            <div className="space-y-3 text-sm">
               <div className="flex justify-between items-center pb-2 border-b border-primary/5">
                  <span className="text-primary/70 font-medium">Monday</span>
                  <span className="text-primary font-bold">Closed</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-primary/5">
                  <span className="text-primary/70 font-medium">Tue – Thu</span>
                  <span className="text-primary font-bold">8:30 AM – 8:00 PM</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-primary/5">
                  <span className="text-primary/70 font-medium">Fri – Sat</span>
                  <span className="text-primary font-bold">8:30 AM – 10:00 PM</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-primary/70 font-medium">Sunday</span>
                  <span className="text-primary font-bold">8:30 AM – 6:00 PM</span>
               </div>
            </div>
         </div>
      </section>

      <section className="px-4 mb-12">
         <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5">
            <h2 className="text-xl font-bold text-primary mb-6">Send a Message</h2>
            
            {isSubmitted ? (
                <div className="py-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                        <span className="material-symbols-outlined text-3xl">check</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">Message Sent</h3>
                    <p className="text-primary/60">Thank you for reaching out. Our team will respond to your inquiry shortly.</p>
                    <button 
                        onClick={() => setIsSubmitted(false)}
                        className="mt-6 text-sm font-bold text-primary underline hover:text-accent"
                    >
                        Send another message
                    </button>
                </div>
            ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="relative">
                    <label className="block text-sm font-medium text-primary mb-1.5 pl-1">Topic</label>
                    <div className="relative">
                        <select className="w-full bg-[#F9F9F7] border-0 rounded-lg py-3 pl-4 pr-10 text-primary ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6 appearance-none">
                            <option>Membership Inquiry</option>
                            <option>Private Events</option>
                            <option>General Information</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                            <span className="material-symbols-outlined">expand_more</span>
                        </div>
                    </div>
                </div>
                <Input label="Full Name" placeholder="Jane Doe" required />
                <Input label="Email Address" type="email" placeholder="jane@example.com" required />
                <div>
                    <label className="block text-sm font-medium text-primary mb-1.5 pl-1">Message</label>
                    <textarea rows={4} className="w-full bg-[#F9F9F7] border-0 rounded-lg py-3 px-4 text-primary ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6 resize-none" placeholder="How can we help you?" required></textarea>
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                    {loading ? (
                        <>Sending...</>
                    ) : (
                        <>Send Message <span className="material-symbols-outlined text-[18px]">send</span></>
                    )}
                </button>
                </form>
            )}
         </div>
      </section>

      {/* Map Section */}
      <section className="px-4 mb-12">
        <div className="w-full h-48 rounded-[2rem] overflow-hidden relative bg-[#E5EADf] border border-black/5">
            <div className="absolute inset-0 opacity-50 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=33.7090,-117.8272&zoom=14&size=600x300&style=feature:all|saturation:-100&sensor=false')] bg-cover bg-center"></div>
            {/* Mock Map Markers/Grid */}
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            <div className="absolute top-1/2 left-1/2 text-[#F05537] transform -translate-x-1/2 -translate-y-1/2">
                <span className="material-symbols-outlined text-3xl drop-shadow-md">location_on</span>
            </div>
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                 <a href="https://maps.google.com/?q=15771+Red+Hill+Ave+Ste+500,+Tustin,+CA+92780" target="_blank" rel="noreferrer" className="bg-white text-primary px-4 py-2 rounded-lg shadow-md font-bold text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">map</span>
                    Open in Maps
                 </a>
            </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

const ContactCard: React.FC<{icon: string; title: string; value: string; href?: string}> = ({ icon, title, value, href }) => {
  const Wrapper = href ? 'a' : 'div';
  return (
    <Wrapper href={href} className="group flex items-center justify-between bg-white p-4 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all cursor-pointer">
       <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-12 rounded-full bg-[#F2F2EC] text-primary shrink-0">
                <span className="material-symbols-outlined text-[24px]">{icon}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mb-0.5">{title}</p>
                <p className="text-primary font-bold truncate text-sm">{value}</p>
            </div>
       </div>
       <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">chevron_right</span>
    </Wrapper>
  );
};

const Input: React.FC<{label: string; type?: string; placeholder?: string; required?: boolean}> = ({ label, type = "text", placeholder, required }) => (
  <div>
    <label className="block text-sm font-medium text-primary mb-1.5 pl-1">{label}</label>
    <input type={type} required={required} className="w-full bg-[#F9F9F7] border-0 rounded-lg py-3 px-4 text-primary ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6" placeholder={placeholder} />
  </div>
);

export default Contact;