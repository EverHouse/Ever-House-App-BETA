import React, { useState } from 'react';
import { Footer } from '../../components/Footer';

const FAQ: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC] overflow-x-hidden">
      <div className="px-6 pt-8 pb-6 animate-pop-in">
        <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Frequently Asked Questions</h1>
        <p className="text-primary/70 text-base font-medium">Common questions about membership, amenities, and policies.</p>
      </div>

      <div className="px-6 pb-12 flex-1 space-y-3 animate-pop-in" style={{animationDelay: '0.1s'}}>
        <AccordionItem 
          question="What is included in the membership?" 
          answer="Membership includes access to our lounge areas, coworking spaces, and the onsite cafe. Core and Premium memberships also include monthly hours for our TrackMan golf simulators and conference room bookings." 
        />
        <AccordionItem 
          question="Can I bring guests?" 
          answer="Yes, members are welcome to bring guests. Social and Core members have a daily guest limit, while Premium members enjoy enhanced guest privileges. Guests must be accompanied by a member at all times." 
        />
        <AccordionItem 
          question="How do I book a simulator?" 
          answer="Members can book simulator bays directly through the Even House app or member portal. Reservations can be made up to 14 days in advance depending on your membership tier." 
        />
        <AccordionItem 
          question="Is there a dress code?" 
          answer="We encourage a 'smart casual' dress code. Golf attire is always welcome. We ask that members avoid athletic wear that is overly casual (e.g., gym tank tops) in the lounge areas." 
        />
        <AccordionItem 
          question="Are the golf simulators suitable for beginners?" 
          answer="Absolutely! Our TrackMan 4 simulators are perfect for all skill levels, from beginners looking to learn the basics to professionals analyzing their swing data. We also offer introductory sessions." 
        />
        <AccordionItem 
          question="Can I host a private event?" 
          answer="Yes, Even House offers several spaces for private hire, including the Main Hall and Private Dining Room. Visit our Private Hire page or contact our events team for more details." 
        />
        <AccordionItem 
          question="What are the operating hours?" 
          answer="We are open Tuesday through Thursday from 8:30 AM to 8:00 PM, Friday and Saturday from 8:30 AM to 10:00 PM, and Sunday from 8:30 AM to 6:00 PM. We are closed on Mondays." 
        />
        <AccordionItem 
          question="Is there parking available?" 
          answer="Yes, ample complimentary parking is available for all members and guests at our Tustin location." 
        />
      </div>

      <Footer />
    </div>
  );
};

const AccordionItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-primary/10 rounded-xl overflow-hidden bg-white/40 backdrop-blur-xl">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left font-bold text-primary hover:bg-primary/5 transition-colors"
      >
        <span>{question}</span>
        <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-4 pt-0 text-sm text-primary/70 leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
};

export default FAQ;