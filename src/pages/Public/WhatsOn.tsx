import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';

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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
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
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      full: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    };
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#EAEBE6] overflow-x-hidden">
      <section className="px-6 pt-10 pb-8 bg-[#EAEBE6] rounded-b-3xl animate-pop-in">
        <h1 className="text-5xl font-light text-primary mb-4 tracking-tight">What's On</h1>
        <p className="text-primary/70 text-base leading-relaxed max-w-[90%]">
           Curated experiences at Even House. Join us for culture, conversation, and community in Tustin.
        </p>
      </section>

      <div className="px-4 space-y-3 pb-12 flex-1 animate-pop-in" style={{animationDelay: '0.1s'}}>
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
            const isExpanded = expandedId === event.id;

            return (
              <div 
                key={event.id} 
                className="bg-white rounded-2xl overflow-hidden shadow-layered transition-all animate-pop-in"
                style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
              >
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className={`flex gap-4 p-4 cursor-pointer transition-all ${isExpanded ? '' : 'active:scale-[0.98]'}`}
                >
                  <div className="w-14 h-14 flex-shrink-0 flex flex-col items-center justify-center rounded-xl bg-[#EAEBE6] text-primary">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{date.month}</span>
                    <span className="text-2xl font-light leading-none">{date.day}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-primary leading-tight truncate">{event.title}</h3>
                        <p className="text-xs text-primary/60 mt-0.5">
                          {formatTime(event.start_time)} • {event.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {event.eventbrite_url && (
                          <span className="px-1.5 py-0.5 rounded bg-[#F05537] text-white text-[8px] font-bold uppercase">Tickets</span>
                        )}
                        <span className={`material-symbols-outlined text-[20px] text-primary/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                  <div className="px-4 pb-4 pt-0">
                    {event.image_url && (
                      <div className="rounded-xl overflow-hidden mb-3">
                        <img src={event.image_url} className="w-full h-40 object-cover" alt={event.title} />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded bg-[#E2DCE6] text-primary text-[10px] font-bold uppercase tracking-wider">{event.category}</span>
                      {event.end_time && (
                        <span className="text-xs text-primary/50">{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-primary/70 leading-relaxed mb-4">{event.description}</p>
                    
                    {event.eventbrite_url ? (
                      <a 
                        href={event.eventbrite_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
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

export default WhatsOn;
