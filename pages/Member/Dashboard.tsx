import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../App';
import { useData } from '../../contexts/DataContext';

interface DBBooking {
  id: number;
  resource_id: number;
  user_email: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  resource_name: string;
  resource_type: string;
}

interface DBRSVP {
  id: number;
  event_id: number;
  user_email: string;
  title: string;
  event_date: string;
  start_time: string;
  location: string;
  category: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { openNotifications } = useContext(NotificationContext);
  const { announcements, user } = useData();
  const latestAnnouncement = announcements[0];
  
  const [resourceBookings, setResourceBookings] = useState<DBBooking[]>([]);
  const [rsvpBookings, setRsvpBookings] = useState<DBRSVP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    }
  }, [user?.email]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, rsvpsRes] = await Promise.all([
        fetch(`/api/bookings?user_email=${encodeURIComponent(user?.email || '')}`),
        fetch(`/api/rsvps?user_email=${encodeURIComponent(user?.email || '')}`)
      ]);
      
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setResourceBookings(bookingsData);
      }
      
      if (rsvpsRes.ok) {
        const rsvpsData = await rsvpsRes.json();
        setRsvpBookings(rsvpsData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (id: number) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('Failed to cancel booking');
        return;
      }
      fetchUserData();
      navigate('/book');
    } catch (err) {
      console.error('Error cancelling booking:', err);
    }
  };

  const handleCancelRSVP = async (eventId: number) => {
    try {
      const res = await fetch(`/api/rsvps/${eventId}/${encodeURIComponent(user?.email || '')}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('Failed to cancel RSVP');
        return;
      }
      fetchUserData();
    } catch (err) {
      console.error('Error cancelling RSVP:', err);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getIconForType = (type: string) => {
    switch(type) {
        case 'simulator': return 'sports_golf';
        case 'conference_room': return 'meeting_room';
        case 'wellness_room': return 'spa';
        default: return 'event';
    }
  };

  return (
    <div className="px-6 pt-4 pb-32 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight animate-pop-in">Hello, {user?.name.split(' ')[0]}</h1>
            <p className="text-white/60 text-sm font-medium mt-1 animate-pop-in" style={{animationDelay: '0.1s'}}>Welcome back to the club.</p>
         </div>
      </div>

      {/* Announcements - Moved to Top & Styled as Alert */}
      {latestAnnouncement && (
         <div 
            onClick={() => openNotifications('announcements')} 
            className="mb-8 bg-accent/10 border border-accent/20 p-3 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-accent/20 transition-all active:scale-[0.98] animate-pop-in shadow-glow"
            style={{animationDelay: '0.15s'}}
         >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0 shadow-sm text-brand-green">
               <span className="material-symbols-outlined text-[20px] filled">notifications</span>
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent mb-0.5">Important Update</span>
               </div>
               <p className="font-bold text-sm truncate text-white leading-tight">{latestAnnouncement.title}</p>
            </div>
            <span className="material-symbols-outlined text-white/40 text-sm">chevron_right</span>
         </div>
      )}

      {/* Control Center Grid - 2x2 Layout */}
      <div className="grid grid-cols-2 gap-3 mb-10">
         {/* Book Card */}
         <button onClick={() => navigate('/book')} className="glass-card p-5 rounded-2xl text-left relative overflow-hidden group border border-white/10 animate-pop-in" style={{animationDelay: '0.2s'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/5">
               <span className="material-symbols-outlined text-white text-[24px]">sports_golf</span>
            </div>
            <h3 className="font-bold text-lg leading-tight text-white">Book</h3>
         </button>

         {/* Cafe Card - Replaces Concierge */}
         <button onClick={() => navigate('/cafe')} className="glass-card p-5 rounded-2xl text-left relative overflow-hidden group border border-white/10 animate-pop-in" style={{animationDelay: '0.25s'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/5">
               <span className="material-symbols-outlined text-white text-[24px]">local_cafe</span>
            </div>
            <h3 className="font-bold text-lg leading-tight text-white">Cafe</h3>
         </button>

         {/* Wellness Card */}
         <button onClick={() => navigate('/member-wellness')} className="glass-card p-5 rounded-2xl text-left relative overflow-hidden group border border-white/10 animate-pop-in" style={{animationDelay: '0.3s'}}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/5">
                <span className="material-symbols-outlined text-white text-[24px]">spa</span>
             </div>
             <h3 className="font-bold text-lg leading-tight text-white">Wellness</h3>
         </button>

         {/* Events Card */}
         <button onClick={() => navigate('/member-events')} className="glass-card p-5 rounded-2xl text-left relative overflow-hidden group border border-white/10 animate-pop-in" style={{animationDelay: '0.35s'}}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/5">
                <span className="material-symbols-outlined text-white text-[24px]">event</span>
             </div>
             <h3 className="font-bold text-lg leading-tight text-white">Events</h3>
         </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-10 animate-pop-in" style={{animationDelay: '0.4s'}}>
         <div>
            <div className="flex justify-between items-center mb-5 px-1">
               <h3 className="font-bold text-lg text-white">Schedule</h3>
               <button onClick={() => navigate('/book')} className="w-8 h-8 rounded-lg glass-button flex items-center justify-center text-white hover:bg-white hover:text-brand-green transition-colors active:scale-90"><span className="material-symbols-outlined text-[20px]">add</span></button>
            </div>
            <div className="space-y-3">
               {loading ? (
                  <div className="glass-panel p-8 rounded-2xl text-center text-sm opacity-50 text-white flex justify-center">
                     <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  </div>
               ) : resourceBookings.length > 0 ? resourceBookings.map((b, idx) => (
                  <GlassRow 
                    key={b.id} 
                    title={b.resource_name} 
                    subtitle={`${formatDate(b.booking_date)} • ${formatTime(b.start_time)}`} 
                    icon={getIconForType(b.resource_type)} 
                    color="text-[#E7E7DC]"
                    actionIcon="edit_calendar"
                    onAction={() => handleReschedule(b.id)}
                    delay={`${0.4 + (idx * 0.1)}s`}
                  />
               )) : (
                  <div className="glass-panel p-8 rounded-2xl text-center text-sm opacity-50 border-dashed border-white/20 text-white">No active bookings</div>
               )}
            </div>
         </div>

         <div>
            <div className="flex justify-between items-center mb-5 px-1">
               <h3 className="font-bold text-lg text-white">Upcoming</h3>
               <button onClick={() => navigate('/member-events')} className="text-xs font-bold text-accent hover:text-white transition-colors uppercase tracking-wider">View All</button>
            </div>
            <div className="space-y-3">
               {loading ? (
                  <div className="glass-panel p-8 rounded-2xl text-center text-sm opacity-50 text-white flex justify-center">
                     <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  </div>
               ) : rsvpBookings.length > 0 ? rsvpBookings.map((b, idx) => (
                  <GlassRow 
                    key={b.id} 
                    title={b.title} 
                    subtitle={`${formatDate(b.event_date)} • ${formatTime(b.start_time)} • ${b.location}`} 
                    icon="celebration"
                    color="text-[#E7E7DC]"
                    actionIcon="close"
                    onAction={() => handleCancelRSVP(b.event_id)}
                    delay={`${0.5 + (idx * 0.1)}s`}
                  />
               )) : (
                  <div className="glass-panel p-8 rounded-2xl text-center text-sm opacity-50 border-dashed border-white/20 text-white">No upcoming events</div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

const GlassRow: React.FC<{title: string; subtitle: string; icon: string; color: string; actionIcon?: string; onAction?: () => void; delay?: string}> = ({ title, subtitle, icon, color, actionIcon, onAction, delay }) => (
   <div className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors border border-white/10 group animate-pop-in" style={{animationDelay: delay}}>
      <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${color} border border-white/5`}>
         <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
         <h4 className="font-bold text-sm text-white truncate">{title}</h4>
         <p className="text-xs text-white/60 truncate">{subtitle}</p>
      </div>
      {actionIcon && onAction && (
          <button onClick={(e) => { e.stopPropagation(); onAction(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors active:scale-90">
              <span className="material-symbols-outlined text-[18px]">{actionIcon}</span>
          </button>
      )}
   </div>
);

export default Dashboard;