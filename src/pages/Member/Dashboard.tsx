import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../App';
import { useData, Booking } from '../../contexts/DataContext';
import GlassRow from '../../components/GlassRow';
import DateButton from '../../components/DateButton';


interface DBBooking {
  id: number;
  resource_id: number;
  resource_name?: string;
  resource_type?: string;
  user_email: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
}

interface DBEvent {
  id: number;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  category: string;
}

interface DBRSVP {
  id: number;
  event_id: number;
  status: string;
  event?: DBEvent;
}

const formatTime12 = (time24: string): string => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { openNotifications } = useContext(NotificationContext);
  const { announcements, user, addBooking, deleteBooking } = useData();
  const latestAnnouncement = announcements[0];
  
  const [dbBookings, setDbBookings] = useState<DBBooking[]>([]);
  const [dbRSVPs, setDbRSVPs] = useState<DBRSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedBooking, setSelectedBooking] = useState<DBBooking | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [checkInConfirmed, setCheckInConfirmed] = useState(false); 
  const [newTime, setNewTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.email) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [bookingsRes, rsvpsRes] = await Promise.all([
          fetch(`/api/bookings?user_email=${encodeURIComponent(user.email)}`),
          fetch(`/api/rsvps?user_email=${encodeURIComponent(user.email)}`)
        ]);
        
        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          setDbBookings(bookings);
        }
        
        if (rsvpsRes.ok) {
          const rsvps = await rsvpsRes.json();
          setDbRSVPs(rsvps);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Unable to load your bookings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [user?.email]);

  const allItems = [
    ...dbBookings.map(b => ({
      id: `booking-${b.id}`,
      dbId: b.id,
      type: 'booking' as const,
      title: b.resource_name || 'Booking',
      resourceType: b.resource_type || 'simulator',
      date: formatDate(b.booking_date),
      time: formatTime12(b.start_time),
      endTime: formatTime12(b.end_time),
      details: `${formatTime12(b.start_time)} - ${formatTime12(b.end_time)}`,
      sortKey: `${b.booking_date}T${b.start_time}`,
      raw: b
    })),
    ...dbRSVPs.map(r => ({
      id: `rsvp-${r.id}`,
      dbId: r.id,
      type: 'rsvp' as const,
      title: r.event?.title || 'Event',
      resourceType: 'event',
      date: r.event ? formatDate(r.event.event_date) : '',
      time: r.event ? formatTime12(r.event.start_time) : '',
      endTime: r.event ? formatTime12(r.event.end_time) : '',
      details: r.event ? `${r.event.location}` : '',
      sortKey: r.event ? `${r.event.event_date}T${r.event.start_time}` : '',
      raw: r
    }))
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const upcomingItems = allItems.filter(item => {
    const itemDate = item.type === 'booking' 
      ? (item.raw as DBBooking).booking_date.split('T')[0]
      : (item.raw as DBRSVP).event?.event_date.split('T')[0];
    return itemDate && itemDate >= todayStr;
  });

  const nextItem = upcomingItems[0];
  const laterItems = upcomingItems.slice(1);

  const getIconForType = (type: string) => {
    switch(type) {
      case 'simulator': return 'sports_golf';
      case 'conference_room': return 'meeting_room';
      case 'wellness_room': return 'spa';
      case 'event': return 'celebration';
      default: return 'event';
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setDbBookings(prev => prev.filter(b => b.id !== bookingId));
        setSelectedBooking(null);
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
    }
  };

  const handleCancelRSVP = async (eventId: number) => {
    if (!window.confirm("Are you sure you want to cancel your RSVP?")) return;
    if (!user?.email) return;
    
    try {
      const res = await fetch(`/api/rsvps/${eventId}/${encodeURIComponent(user.email)}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setDbRSVPs(prev => prev.filter(r => r.event_id !== eventId));
      }
    } catch (err) {
      console.error('Error cancelling RSVP:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-6 pt-4 pb-32 font-sans relative min-h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight animate-pop-in">
            {getGreeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-white/60 text-sm font-medium mt-1 animate-pop-in" style={{animationDelay: '0.1s'}}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={() => openNotifications('announcements')} 
          className="relative w-10 h-10 flex items-center justify-center rounded-full glass-button text-white hover:bg-white/10 active:scale-95 transition-all focus:ring-2 focus:ring-accent focus:outline-none"
          aria-label="View notifications"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          {announcements.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0f120a]"></span>}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/50">
          <span className="material-symbols-outlined animate-spin text-3xl mb-4">progress_activity</span>
          <p className="text-sm">Loading your schedule...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      ) : (
        <>
          <div className="mb-8 animate-pop-in" style={{animationDelay: '0.15s'}}>
            {nextItem ? (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E7E7DC] to-[#d4d4cb] p-6 shadow-glow text-brand-green group">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="material-symbols-outlined text-[120px]">{getIconForType(nextItem.resourceType)}</span>
                </div>
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 bg-brand-green/10 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border border-brand-green/10">Next Up</span>
                  <h2 className="text-2xl font-bold leading-tight mb-1">{nextItem.title}</h2>
                  <p className="text-sm font-medium opacity-80 mb-1">{nextItem.date}</p>
                  <p className="text-sm font-medium opacity-60 mb-6">{nextItem.details}</p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        setCheckInConfirmed(true);
                        setTimeout(() => setCheckInConfirmed(false), 3000);
                      }}
                      className="flex-1 bg-brand-green text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 focus:ring-2 focus:ring-accent focus:outline-none"
                      aria-label="Check in to booking"
                    >
                      {checkInConfirmed ? (
                        <>
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          Checked In
                        </>
                      ) : 'Check In'}
                    </button>
                    {nextItem.type === 'booking' && (
                      <button 
                        onClick={() => handleCancelBooking(nextItem.dbId)}
                        className="w-12 flex items-center justify-center bg-white/50 hover:bg-white rounded-xl transition-colors text-brand-green border border-brand-green/10 focus:ring-2 focus:ring-accent focus:outline-none"
                        aria-label="Cancel booking"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 flex items-center justify-between group">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">No upcoming bookings</h2>
                  <p className="text-sm text-white/50">Ready to plan your day?</p>
                </div>
                <button 
                  onClick={() => navigate('/book')} 
                  className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-brand-green shadow-glow active:scale-90 transition-transform focus:ring-2 focus:ring-white focus:outline-none"
                  aria-label="Make a new booking"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            )}
          </div>

          <div className="mb-8 -mx-6 px-6 overflow-x-auto scrollbar-hide flex gap-4 animate-slide-in-right" style={{animationDelay: '0.2s'}}>
            <QuickAction icon="sports_golf" label="Golf" onClick={() => navigate('/book')} delay="0s" />
            <QuickAction icon="spa" label="Wellness" onClick={() => navigate('/member-wellness')} delay="0.05s" />
            <QuickAction icon="calendar_month" label="Events" onClick={() => navigate('/member-events')} delay="0.1s" />
            <QuickAction icon="local_cafe" label="Cafe" onClick={() => navigate('/cafe')} delay="0.15s" />
          </div>

          <div className="space-y-8 animate-pop-in" style={{animationDelay: '0.3s'}}>
            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">Upcoming</h3>
              </div>
              <div className="space-y-3">
                {laterItems.length > 0 ? laterItems.map((item, idx) => (
                  <GlassRow 
                    key={item.id} 
                    title={item.title} 
                    subtitle={`${item.date} • ${item.details}`} 
                    icon={getIconForType(item.resourceType)} 
                    color="text-[#E7E7DC]"
                    actions={item.type === 'booking' ? [
                      { icon: 'close', label: 'Cancel', onClick: () => handleCancelBooking(item.dbId) }
                    ] : [
                      { icon: 'close', label: 'Cancel RSVP', onClick: () => handleCancelRSVP((item.raw as DBRSVP).event_id) }
                    ]}
                    delay={`${0.3 + (idx * 0.1)}s`}
                  />
                )) : (
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/5 text-center">
                    <p className="text-sm text-white/40">No upcoming bookings or events.</p>
                    <button 
                      onClick={() => navigate('/book')}
                      className="mt-3 text-accent text-sm font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-accent rounded"
                    >
                      Book something now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const QuickAction: React.FC<{icon: string; label: string; onClick: () => void; delay: string}> = ({ icon, label, onClick, delay }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 min-w-[80px] group focus:outline-none"
    style={{animationDelay: delay}}
    aria-label={label}
  >
    <div className="w-16 h-16 rounded-2xl glass-button border border-white/10 flex items-center justify-center text-white group-hover:bg-white/10 group-active:scale-95 transition-all shadow-lg group-focus:ring-2 group-focus:ring-accent">
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</span>
  </button>
);

export default Dashboard;
