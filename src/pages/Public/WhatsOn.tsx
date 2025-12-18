import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { parseLocalDate, formatTime12 } from '../../utils/dateUtils';

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  category: string;
  image_url?: string;
  max_attendees?: number;
  eventbrite_id?: string;
  eventbrite_url?: string;
  source?: string;
  visibility?: string;
  requires_rsvp?: boolean;
  google_calendar_id?: string;
}

const WhatsOn: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Only fetch public events for the public page
        const response = await fetch('/api/events?visibility=public');
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      full: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    };
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'TBD';
    return formatTime12(timeString);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#EAEBE6] overflow-x-hidden">
      <section className="px-6 pt-10 pb-8 bg-[#EAEBE6] rounded-b-3xl">
        <h1 className="text-5xl font-light text-primary mb-4 tracking-tight">What's On</h1>
        <p className="text-primary/70 text-base leading-relaxed max-w-[90%]">
           Curated experiences at Even House. Join us for culture, conversation, and community in Tustin.
        </p>
      </section>

      <div className="px-4 space-y-4 pb-12 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-primary/30 mb-4">calendar_month</span>
            <p className="text-primary/60">No upcoming events scheduled.</p>
            <p className="text-primary/40 text-sm mt-2">Check back soon for new experiences.</p>
          </div>
        ) : (
          events.map((event, index) => {
            const date = formatDate(event.event_date);
            const isDark = index % 3 === 2;
            const isFeatured = index === 0;

            if (isFeatured) {
              return (
                <div key={event.id} className="bg-[#EAEBE6] rounded-[2rem] p-4 pb-6">
                  {event.image_url && (
                    <div className="rounded-[1.5rem] overflow-hidden relative mb-4">
                      <img src={event.image_url} className="w-full h-56 object-cover" alt={event.title} />
                      <span className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary">{event.category}</span>
                    </div>
                  )}
                  {!event.image_url && (
                    <div className="rounded-[1.5rem] overflow-hidden relative mb-4 h-56 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-primary/20">celebration</span>
                      <span className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary">{event.category}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start px-2">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-[#E2DCE6] text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{date.full}</span>
                        <span className="text-xs text-primary/60">{formatTime(event.start_time)}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-primary mb-2">{event.title}</h3>
                      <p className="text-primary/70 text-sm leading-relaxed mb-4">{event.description}</p>
                      
                      {event.eventbrite_url ? (
                        <a 
                          href={event.eventbrite_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full bg-[#F05537] hover:bg-[#d94a2f] text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors"
                        >
                          <span>Get Tickets</span>
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      ) : (
                        <div className="w-full bg-[#F2F2EC] py-3 rounded-xl flex items-center justify-center px-4">
                          <span className="text-xs font-medium text-primary/60">Members Only Event</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <EventCard 
                key={event.id}
                event={event}
                date={date}
                formatTime={formatTime}
                dark={isDark}
              />
            );
          })
        )}
      </div>

      <section className="px-4 py-8 mb-4">
        <div className="bg-[#293515] rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Want full access to all events?</h3>
          <p className="text-white/70 text-sm mb-4">Join Even House and unlock exclusive member-only experiences.</p>
          <button 
            onClick={() => navigate('/membership')}
            className="bg-[#F2F2EC] text-[#293515] px-6 py-3 rounded-xl font-bold text-sm hover:bg-white transition-colors"
          >
            Explore Membership
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

interface EventCardProps {
  event: Event;
  date: { day: string; month: string; weekday: string; full: string };
  formatTime: (time: string) => string;
  dark?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, date, formatTime, dark }) => (
  <article className={`group p-6 rounded-[2rem] mx-2 ${dark ? 'bg-[#293515] text-white' : 'bg-[#F2F2EC] text-primary'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`w-16 h-20 flex-shrink-0 flex flex-col items-center justify-center rounded-xl ${dark ? 'bg-white/10 text-white' : 'bg-[#EAEBE6] text-primary'}`}>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{date.month}</span>
        <span className="text-3xl font-light leading-none">{date.day}</span>
      </div>
      <div className="flex items-center gap-2">
        {event.eventbrite_url && (
          <span className="px-2 py-0.5 rounded bg-[#F05537] text-white text-[10px] font-bold uppercase">Eventbrite</span>
        )}
        <span className={`px-2 py-0.5 rounded border ${dark ? 'border-white/20 text-white/60' : 'border-primary/20 text-primary/60'} text-[10px] font-bold uppercase`}>{event.category}</span>
      </div>
    </div>
    
    <h3 className="text-xl font-bold mb-2">{event.title}</h3>
    <p className={`text-sm leading-relaxed mb-1 ${dark ? 'text-white/60' : 'text-primary/70'}`}>{event.description}</p>
    <p className={`text-xs ${dark ? 'text-white/40' : 'text-primary/50'}`}>
      {formatTime(event.start_time)} - {formatTime(event.end_time)} • {event.location}
    </p>
    
    {event.eventbrite_url && (
      <a 
        href={event.eventbrite_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`mt-4 inline-flex items-center gap-1 text-sm font-bold ${dark ? 'text-white hover:text-white/80' : 'text-primary hover:text-primary/80'} transition-colors`}
      >
        Get Tickets <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </a>
    )}
  </article>
);

export default WhatsOn;
