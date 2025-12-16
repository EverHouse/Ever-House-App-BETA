import React, { useState } from 'react';
import { useData, EventData } from '../../contexts/DataContext';

const MemberEvents: React.FC = () => {
  const { events, addBooking } = useData();
  const [filter, setFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const filteredEvents = filter === 'All' 
    ? events 
    : events.filter(e => e.category === filter);

  const handleRSVP = () => {
    if (selectedEvent?.source === 'eventbrite' && selectedEvent.externalLink) {
        window.open(selectedEvent.externalLink, '_blank');
        return;
    }

    if (selectedEvent) {
        addBooking({
            id: Date.now().toString(),
            type: 'event',
            title: selectedEvent.title,
            date: selectedEvent.date.split(',')[1].trim(),
            time: selectedEvent.time,
            details: selectedEvent.location,
            color: 'accent'
        });
    }

    setSelectedEvent(null);
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
    }, 2500);
  };

  return (
    <div className="px-6 pt-2 relative min-h-screen pb-24 overflow-hidden">
      <section className="mb-4 pt-2">
        <h1 className="text-3xl font-serif leading-tight text-white drop-shadow-md">Upcoming Events</h1>
        <p className="text-white/70 text-sm font-medium mt-1">Discover what's happening at the House.</p>
      </section>

      <section className="mb-8 border-b border-white/10 -mx-6 px-6">
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide">
          {['All', 'Social', 'Dining', 'Wellness', 'Sport'].map(cat => (
            <button 
              key={cat}
              onClick={() => setFilter(cat)}
              className={`pb-3 border-b-[3px] ${filter === cat ? 'border-white text-white font-bold' : 'border-transparent text-white/60 font-medium'} text-sm whitespace-nowrap transition-colors`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="relative z-10 animate-pop-in">
         <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">Select Date</h3>
              <button className="text-sm text-white font-semibold">January 2024</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              <DateButton day="Fri" date="20" active />
              <DateButton day="Sat" date="21" />
              <DateButton day="Sun" date="22" />
              <DateButton day="Mon" date="23" />
              <DateButton day="Tue" date="24" />
            </div>
        </section>

         <section className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-3">Events</h3>
            <div className="space-y-4">
                {filteredEvents.length === 0 ? (
                    <p className="text-sm text-white/60 italic">No events found in this category.</p>
                ) : filteredEvents.map((event, index) => (
                  <div 
                    key={event.id} 
                    onClick={() => setSelectedEvent(event)}
                    className="flex gap-4 p-4 rounded-xl glass-card relative overflow-hidden group cursor-pointer hover:bg-white/10 transition-all animate-pop-in"
                    style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
                  >
                     <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white/10 relative">
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90" />
                        {event.source === 'eventbrite' && (
                            <div className="absolute bottom-0 left-0 right-0 bg-[#F05537] text-white text-[8px] font-bold uppercase text-center py-0.5">
                                Eventbrite
                            </div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-base font-bold text-white leading-tight truncate pr-2">{event.title}</h4>
                            {event.source === 'eventbrite' ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F05537]/20 text-[#F05537] px-1.5 py-0.5 rounded-md whitespace-nowrap">Ticketed</span>
                            ) : event.id === '3' ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-md whitespace-nowrap">Waitlist</span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-md whitespace-nowrap">Open</span>
                            )}
                        </div>
                        <p className="text-xs text-white/60 mb-1">{event.date} • {event.time}</p>
                        <p className="text-xs text-white/50 truncate">{event.location}</p>
                     </div>
                  </div>
                ))}
            </div>
         </section>
      </div>

      {showConfirmation && (
         <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border border-white/10">
            <span className="material-symbols-outlined text-xl text-green-400">check_circle</span>
            <div>
              <p>You are on the list.</p>
            </div>
         </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedEvent(null)}></div>
          
          <div className="relative w-full max-w-md glass-card bg-[#1a210d] h-[90vh] rounded-t-3xl shadow-2xl animate-slide-up flex flex-col overflow-hidden border-t border-white/10">
             <div className="relative h-64 w-full flex-shrink-0 bg-white/5">
                <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-cover opacity-90" />
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                <div className="absolute top-4 right-4 bg-accent text-brand-green px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-glow">
                  {selectedEvent.category}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="flex items-start justify-between">
                    <div className="inline-block bg-white/5 border border-white/10 rounded-lg px-3 py-2 mb-4">
                        <span className="block text-white font-serif text-lg leading-none mb-0.5">{selectedEvent.date.split(',')[0]}</span>
                        <span className="block text-white/60 text-xs font-medium uppercase">{selectedEvent.time}</span>
                    </div>
                    {selectedEvent.source === 'eventbrite' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F05537]/20 rounded-full">
                             <span className="w-1.5 h-1.5 rounded-full bg-[#F05537]"></span>
                             <span className="text-[10px] font-bold uppercase text-[#F05537]">Eventbrite Event</span>
                        </div>
                    )}
                </div>

                <h2 className="text-3xl font-serif text-white mb-2 leading-tight">{selectedEvent.title}</h2>
                <p className="text-white/60 text-sm mb-6">{selectedEvent.location}</p>

                <div className="w-full h-px bg-white/10 mb-6"></div>

                <div className="space-y-6">
                   <div>
                     <h3 className="text-sm font-bold text-white mb-2">About</h3>
                     <p className="text-white/80 text-base leading-relaxed font-light">
                       {selectedEvent.description}
                     </p>
                   </div>
                   
                   <div>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-white">Attendees</h3>
                        {selectedEvent.ticketsSold && selectedEvent.capacity && (
                          <span className="text-xs text-white/50 font-medium">
                              {selectedEvent.ticketsSold} / {selectedEvent.capacity} Spots Filled
                          </span>
                        )}
                     </div>
                     <div className="flex items-center gap-2">
                        {selectedEvent.attendees.length > 0 ? (
                          <>
                             {selectedEvent.attendees.map((src, i) => (
                               <img key={i} src={src} className="w-10 h-10 rounded-full border-2 border-[#1a210d] object-cover" alt="Attendee" />
                             ))}
                             {selectedEvent.ticketsSold && selectedEvent.ticketsSold > selectedEvent.attendees.length && (
                                <div className="w-10 h-10 rounded-full border border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs font-bold">
                                    +{selectedEvent.ticketsSold - selectedEvent.attendees.length}
                                </div>
                             )}
                          </>
                        ) : selectedEvent.ticketsSold && selectedEvent.ticketsSold > 0 ? (
                            <span className="text-sm text-white/50 italic">{selectedEvent.ticketsSold} members attending via Eventbrite.</span>
                        ) : (
                          <p className="text-sm text-white/50 italic">Be the first to RSVP.</p>
                        )}
                     </div>
                   </div>
                </div>
             </div>

             <div className="p-6 border-t border-white/10 bg-[#1a210d] pb-8">
                {selectedEvent.id === '3' ? (
                  <button 
                    onClick={handleRSVP}
                    className="w-full bg-transparent border border-white text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-white/5 transition-colors"
                  >
                    Join Waiting List
                  </button>
                ) : (
                  <div className="flex gap-3">
                     <button className="flex-1 bg-transparent border border-white/20 text-white py-4 rounded-xl font-bold text-sm tracking-wide hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                        Add to Cal
                     </button>
                     <button 
                        onClick={handleRSVP}
                        className={`flex-[2] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg ${selectedEvent.source === 'eventbrite' ? 'bg-[#F05537]' : 'bg-white text-brand-green'}`}
                     >
                        {selectedEvent.source === 'eventbrite' ? 'Get Tickets' : 'RSVP'}
                     </button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DateButton: React.FC<{day: string; date: string; active?: boolean}> = ({ day, date, active }) => (
  <button className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-transform active:scale-95 ${active ? 'bg-white text-brand-green shadow-glow' : 'glass-button text-white'}`}>
    <span className={`text-xs font-medium mb-1 ${active ? 'opacity-80' : 'opacity-60'}`}>{day}</span>
    <span className="text-xl font-bold">{date}</span>
  </button>
);

export default MemberEvents;