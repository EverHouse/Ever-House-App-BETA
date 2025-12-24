
import React, { useState, useMemo } from 'react';
import { useData, EventData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../lib/apiRequest';
import Skeleton from '../../components/Skeleton';
import { EventCardSkeleton, SkeletonList } from '../../components/skeletons';
import DateButton from '../../components/DateButton';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';
import { getDateString, formatDateShort, parseLocalDate } from '../../utils/dateUtils';
import { MotionList, MotionListItem } from '../../components/motion';
import { EmptyEvents } from '../../components/EmptyState';

const generateUpcomingDates = (days: number = 14): { day: string; date: string; dateNum: string; fullDate: string }[] => {
  const dates = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      day: dayNames[d.getDay()],
      dateNum: d.getDate().toString(),
      date: getDateString(d),
      fullDate: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
  }
  return dates;
};

const MemberEvents: React.FC = () => {
  const { events, addBooking, isLoading } = useData();
  const { effectiveTheme } = useTheme();
  const { showToast } = useToast();
  const isDark = effectiveTheme === 'dark';
  const [filter, setFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  
  const upcomingDates = useMemo(() => generateUpcomingDates(14), []);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);

  const filteredEvents = useMemo(() => {
    let result = events;
    
    if (filter !== 'All') {
      result = result.filter(e => e.category.toLowerCase() === filter.toLowerCase());
    }
    
    if (selectedDateIndex !== null) {
      const selectedDateStr = upcomingDates[selectedDateIndex].date;
      result = result.filter(e => {
        const eventDateStr = e.date;
        const formattedSelectedDate = formatDateShort(selectedDateStr);
        return eventDateStr === formattedSelectedDate;
      });
    }
    
    return result;
  }, [events, filter, selectedDateIndex, upcomingDates]);
  
  const currentMonthYear = selectedDateIndex !== null 
    ? upcomingDates[selectedDateIndex].fullDate 
    : upcomingDates[0]?.fullDate || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const handleDateSelect = (index: number) => {
    setSelectedDateIndex(selectedDateIndex === index ? null : index);
  };

  const handleRSVP = async () => {
    if (selectedEvent?.source === 'eventbrite' && selectedEvent.externalLink) {
        window.open(selectedEvent.externalLink, '_blank');
        return;
    }

    if (selectedEvent && user?.email) {
        const { ok, error } = await apiRequest('/api/rsvps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: selectedEvent.id,
                user_email: user.email
            })
        });
        
        if (ok) {
            showToast('You are on the list!', 'success');
        } else {
            showToast(error || 'Unable to load data. Please try again.', 'error');
        }
    }

    setSelectedEvent(null);
  };

  return (
    <SwipeablePage className="px-6 pt-2 relative min-h-screen pb-24 overflow-hidden">
      <section className="mb-4 pt-2">
        <h1 className={`text-3xl font-bold leading-tight drop-shadow-md ${isDark ? 'text-white' : 'text-primary'}`}>Upcoming Events</h1>
        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Discover what's happening at the House.</p>
      </section>

      <section className={`mb-8 border-b -mx-6 px-6 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide">
          {['All', 'Social', 'Dining', 'Wellness', 'Sport'].map(cat => (
            <TabButton 
                key={cat} 
                label={cat} 
                active={filter === cat} 
                onClick={() => setFilter(cat)} 
                isDark={isDark}
            />
          ))}
        </div>
      </section>

      <div className="relative z-10">
         <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-primary/80'}`}>
                {selectedDateIndex !== null ? 'Showing' : 'Filter by Date'}
              </h3>
              <div className="flex items-center gap-2">
                {selectedDateIndex !== null && (
                  <button 
                    onClick={() => setSelectedDateIndex(null)}
                    className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/5 text-primary/70 hover:bg-black/10'}`}
                  >
                    Clear
                  </button>
                )}
                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-primary'}`}>{currentMonthYear}</span>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {upcomingDates.map((dateObj, index) => (
                <DateButton 
                  key={dateObj.date}
                  day={dateObj.day} 
                  date={dateObj.dateNum} 
                  active={selectedDateIndex === index}
                  onClick={() => handleDateSelect(index)}
                  isDark={isDark} 
                />
              ))}
            </div>
        </section>

         <section className="mb-6">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/80' : 'text-primary/80'}`}>Events</h3>
            {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                    <SkeletonList count={4} Component={EventCardSkeleton} isDark={isDark} className="grid grid-cols-1 gap-4" />
                </div>
            ) : filteredEvents.length === 0 ? (
                <EmptyEvents />
            ) : (
                <MotionList className="space-y-4">
                    {filteredEvents.map((event) => (
                    <MotionListItem 
                        key={event.id} 
                        onClick={() => setSelectedEvent(event)}
                        className={`flex gap-4 p-4 rounded-xl relative overflow-hidden group cursor-pointer transition-all ${isDark ? 'glass-card hover:bg-white/10' : 'bg-white hover:bg-black/5 border border-black/5 shadow-sm'}`}
                    >
                        <div className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden relative ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                            <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90" />
                            {event.source === 'eventbrite' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-[#F05537] text-white text-[8px] font-bold uppercase text-center py-0.5">
                                    Eventbrite
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-base font-bold leading-tight truncate pr-2 ${isDark ? 'text-white' : 'text-primary'}`}>{event.title}</h4>
                                {event.source === 'eventbrite' ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F05537]/20 text-[#F05537] px-1.5 py-0.5 rounded-md whitespace-nowrap">Ticketed</span>
                                ) : event.id === '3' ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-md whitespace-nowrap">Waitlist</span>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-md whitespace-nowrap">Open</span>
                                )}
                            </div>
                            <p className={`text-xs mb-1 ${isDark ? 'text-white/60' : 'text-primary/60'}`}>{event.date} • {event.time}</p>
                            <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-primary/50'}`}>{event.location}</p>
                        </div>
                    </MotionListItem>
                    ))}
                </MotionList>
            )}
         </section>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pt-16">
          <div className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setSelectedEvent(null)}></div>
          
          <div className={`relative w-full max-w-md h-[calc(90vh-4rem)] rounded-t-3xl shadow-2xl animate-slide-up flex flex-col overflow-hidden border-t ${isDark ? 'glass-card bg-[#1a210d] border-white/10' : 'bg-white border-black/10'}`}>
             <div className={`relative h-56 w-full flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-cover opacity-90" />
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-lg"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                <div className="absolute top-4 right-4 bg-[#E7E7DC] text-[#293515] px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-glow">
                  {selectedEvent.category}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="flex items-start justify-between">
                    <div className={`inline-block border rounded-lg px-3 py-2 mb-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <span className={`block font-bold text-lg leading-none mb-0.5 ${isDark ? 'text-white' : 'text-primary'}`}>{selectedEvent.date.split(',')[0]}</span>
                        <span className={`block text-xs font-medium uppercase ${isDark ? 'text-white/60' : 'text-primary/60'}`}>{selectedEvent.time}</span>
                    </div>
                    {selectedEvent.source === 'eventbrite' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F05537]/20 rounded-full">
                             <span className="w-1.5 h-1.5 rounded-full bg-[#F05537]"></span>
                             <span className="text-[10px] font-bold uppercase text-[#F05537]">Eventbrite Event</span>
                        </div>
                    )}
                </div>

                <h2 className={`text-3xl font-bold mb-2 leading-tight ${isDark ? 'text-white' : 'text-primary'}`}>{selectedEvent.title}</h2>
                <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-primary/60'}`}>{selectedEvent.location}</p>

                <div className={`w-full h-px mb-6 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>

                <div className="space-y-6">
                   <div>
                     <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-primary'}`}>About</h3>
                     <p className={`text-base leading-relaxed font-light ${isDark ? 'text-white/80' : 'text-primary/80'}`}>
                       {selectedEvent.description}
                     </p>
                   </div>
                   
                   <div>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-primary'}`}>Attendees</h3>
                        {selectedEvent.ticketsSold && selectedEvent.capacity && (
                          <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-primary/50'}`}>
                              {selectedEvent.ticketsSold} / {selectedEvent.capacity} Spots Filled
                          </span>
                        )}
                     </div>
                     <div className="flex items-center gap-2">
                        {selectedEvent.attendees.length > 0 ? (
                          <>
                             {selectedEvent.attendees.map((src, i) => (
                               <img key={i} src={src} className={`w-10 h-10 rounded-full border-2 object-cover ${isDark ? 'border-[#1a210d]' : 'border-white'}`} alt="Attendee" />
                             ))}
                             {selectedEvent.ticketsSold && selectedEvent.ticketsSold > selectedEvent.attendees.length && (
                                <div className={`w-10 h-10 rounded-full border border-dashed flex items-center justify-center text-xs font-bold ${isDark ? 'border-white/30 text-white/40' : 'border-black/30 text-primary/40'}`}>
                                    +{selectedEvent.ticketsSold - selectedEvent.attendees.length}
                                </div>
                             )}
                          </>
                        ) : selectedEvent.ticketsSold && selectedEvent.ticketsSold > 0 ? (
                            <span className={`text-sm italic ${isDark ? 'text-white/50' : 'text-primary/50'}`}>{selectedEvent.ticketsSold} members attending via Eventbrite.</span>
                        ) : (
                          <p className={`text-sm italic ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Be the first to RSVP.</p>
                        )}
                     </div>
                   </div>
                </div>
             </div>

             <div className={`p-6 border-t pb-8 ${isDark ? 'border-white/10 bg-[#1a210d]' : 'border-black/10 bg-white'}`}>
                {selectedEvent.id === '3' ? (
                  <button 
                    onClick={handleRSVP}
                    className={`w-full bg-transparent border py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors ${isDark ? 'border-white text-white hover:bg-white/5' : 'border-primary text-primary hover:bg-black/5'}`}
                  >
                    Join Waiting List
                  </button>
                ) : (
                  <div className="flex gap-3">
                     <button className={`flex-1 bg-transparent border py-4 rounded-xl font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 ${isDark ? 'border-white/20 text-white hover:bg-white/5' : 'border-black/20 text-primary hover:bg-black/5'}`}>
                        <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                        Add to Cal
                     </button>
                     <button 
                        onClick={handleRSVP}
                        className={`flex-[2] py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg ${selectedEvent.source === 'eventbrite' ? 'bg-[#F05537] text-white' : 'bg-brand-green text-white'}`}
                     >
                        {selectedEvent.source === 'eventbrite' ? 'Get Tickets' : 'RSVP'}
                     </button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </SwipeablePage>
  );
};

export default MemberEvents;