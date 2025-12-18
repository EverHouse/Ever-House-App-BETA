import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, Booking } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import GlassRow from '../../components/GlassRow';
import DateButton from '../../components/DateButton';
import WelcomeBanner from '../../components/WelcomeBanner';
import { formatDate, formatTime12 } from '../../utils/dateUtils';


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

interface DBAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

interface DBPartner {
  id: number;
  booking_id: number;
  partner_name: string;
  partner_email?: string;
  is_member: boolean;
}


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, addBooking, deleteBooking } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  
  const [dbBookings, setDbBookings] = useState<DBBooking[]>([]);
  const [dbRSVPs, setDbRSVPs] = useState<DBRSVP[]>([]);
  const [announcements, setAnnouncements] = useState<DBAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedBooking, setSelectedBooking] = useState<DBBooking | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [checkInConfirmed, setCheckInConfirmed] = useState(false); 
  const [newTime, setNewTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerBooking, setPartnerBooking] = useState<DBBooking | null>(null);
  const [partners, setPartners] = useState<DBPartner[]>([]);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.email) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [bookingsRes, rsvpsRes, announcementsRes] = await Promise.all([
          fetch(`/api/bookings?user_email=${encodeURIComponent(user.email)}`),
          fetch(`/api/rsvps?user_email=${encodeURIComponent(user.email)}`),
          fetch('/api/announcements?active_only=true')
        ]);
        
        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          setDbBookings(bookings);
        }
        
        if (rsvpsRes.ok) {
          const rsvps = await rsvpsRes.json();
          setDbRSVPs(rsvps);
        }
        
        if (announcementsRes.ok) {
          const anns = await announcementsRes.json();
          setAnnouncements(anns);
        }
        
        const birthdayRes = await fetch(`/api/birthday-check?email=${encodeURIComponent(user.email)}`);
        if (birthdayRes.ok) {
          const data = await birthdayRes.json();
          setIsBirthday(data.isBirthday);
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

  const openPartnerModal = async (booking: DBBooking) => {
    setPartnerBooking(booking);
    setShowPartnerModal(true);
    setIsLoadingPartners(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/partners`);
      if (res.ok) {
        setPartners(await res.json());
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  const addPartner = async () => {
    if (!partnerBooking || !newPartnerName.trim()) return;
    try {
      const res = await fetch(`/api/bookings/${partnerBooking.id}/partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_name: newPartnerName.trim() })
      });
      if (res.ok) {
        const partner = await res.json();
        setPartners(prev => [...prev, partner]);
        setNewPartnerName('');
      }
    } catch (err) {
      console.error('Error adding partner:', err);
    }
  };

  const removePartner = async (partnerId: number) => {
    if (!partnerBooking) return;
    try {
      await fetch(`/api/bookings/${partnerBooking.id}/partners/${partnerId}`, {
        method: 'DELETE'
      });
      setPartners(prev => prev.filter(p => p.id !== partnerId));
    } catch (err) {
      console.error('Error removing partner:', err);
    }
  };

  return (
    <div className="px-6 pt-4 pb-32 font-sans relative min-h-full">
      {/* Welcome banner for new members */}
      <WelcomeBanner />
      
      <div className="mb-6">
        {isBirthday ? (
          <>
            <h1 className={`text-3xl font-bold tracking-tight animate-pop-in ${isDark ? 'text-white' : 'text-primary'}`}>
              Happy Birthday, {user?.name.split(' ')[0]}! 🎂
            </h1>
            <p className={`text-sm font-medium mt-1 animate-pop-in ${isDark ? 'text-accent' : 'text-brand-green'}`} style={{animationDelay: '0.1s'}}>
              Wishing you a wonderful day from all of us at Even House!
            </p>
          </>
        ) : (
          <>
            <h1 className={`text-3xl font-bold tracking-tight animate-pop-in ${isDark ? 'text-white' : 'text-primary'}`}>
              {getGreeting()}, {user?.name.split(' ')[0]}
            </h1>
            <p className={`text-sm font-medium mt-1 animate-pop-in ${isDark ? 'text-white/60' : 'text-primary/60'}`} style={{animationDelay: '0.1s'}}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </>
        )}
      </div>

      {announcements.length > 0 && (
        <div className="mb-6 space-y-3 animate-pop-in" style={{animationDelay: '0.12s'}}>
          {announcements.map((ann) => {
            const priorityStyles: Record<string, string> = {
              urgent: isDark ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700',
              high: isDark ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700',
              normal: isDark ? 'bg-accent/20 border-accent/40 text-white' : 'bg-accent/20 border-accent/40 text-brand-green',
              low: isDark ? 'bg-white/10 border-white/20 text-white/70' : 'bg-gray-50 border-gray-200 text-gray-600'
            };
            const priorityIcons: Record<string, string> = {
              urgent: 'error',
              high: 'warning',
              normal: 'campaign',
              low: 'info'
            };
            return (
              <div 
                key={ann.id} 
                className={`p-4 rounded-2xl border ${priorityStyles[ann.priority] || priorityStyles.normal}`}
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-xl mt-0.5">
                    {priorityIcons[ann.priority] || 'campaign'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm">{ann.title}</h4>
                    <p className="text-sm opacity-80 mt-1">{ann.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className={`flex flex-col items-center justify-center py-16 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>
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
                    {nextItem.type === 'booking' && nextItem.resourceType === 'simulator' && (
                      <button 
                        onClick={() => openPartnerModal(nextItem.raw as DBBooking)}
                        className="w-12 flex items-center justify-center bg-white/50 hover:bg-white rounded-xl transition-colors text-brand-green border border-brand-green/10 focus:ring-2 focus:ring-accent focus:outline-none"
                        aria-label="Manage playing partners"
                      >
                        <span className="material-symbols-outlined">group_add</span>
                      </button>
                    )}
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
              <div className={`relative overflow-hidden rounded-3xl p-6 flex items-center justify-between group ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/5 shadow-sm'}`}>
                <div>
                  <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-primary'}`}>No upcoming bookings</h2>
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Ready to plan your day?</p>
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
            <QuickAction icon="sports_golf" label="Golf" onClick={() => navigate('/book')} delay="0s" isDark={isDark} />
            <QuickAction icon="spa" label="Wellness" onClick={() => navigate('/member-wellness')} delay="0.05s" isDark={isDark} />
            <QuickAction icon="calendar_month" label="Events" onClick={() => navigate('/member-events')} delay="0.1s" isDark={isDark} />
            <QuickAction icon="local_cafe" label="Cafe" onClick={() => navigate('/cafe')} delay="0.15s" isDark={isDark} />
          </div>

          <div className="space-y-8 animate-pop-in" style={{animationDelay: '0.3s'}}>
            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-primary/60'}`}>Upcoming</h3>
              </div>
              <div className="space-y-3">
                {laterItems.length > 0 ? laterItems.map((item, idx) => (
                  <GlassRow 
                    key={item.id} 
                    title={item.title} 
                    subtitle={`${item.date} • ${item.details}`} 
                    icon={getIconForType(item.resourceType)} 
                    color={isDark ? "text-[#E7E7DC]" : "text-primary"}
                    actions={item.type === 'booking' ? [
                      ...(item.resourceType === 'simulator' ? [{ icon: 'group_add', label: 'Partners', onClick: () => openPartnerModal(item.raw as DBBooking) }] : []),
                      { icon: 'close', label: 'Cancel', onClick: () => handleCancelBooking(item.dbId) }
                    ] : [
                      { icon: 'close', label: 'Cancel RSVP', onClick: () => handleCancelRSVP((item.raw as DBRSVP).event_id) }
                    ]}
                    delay={`${0.3 + (idx * 0.1)}s`}
                  />
                )) : (
                  <div className={`p-4 rounded-2xl text-center ${isDark ? 'border border-white/5 bg-white/5' : 'border border-black/5 bg-white shadow-sm'}`}>
                    <p className={`text-sm ${isDark ? 'text-white/40' : 'text-primary/40'}`}>No upcoming bookings or events.</p>
                    <button 
                      onClick={() => navigate('/book')}
                      className={`mt-3 text-sm font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-accent rounded ${isDark ? 'text-accent' : 'text-brand-green'}`}
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

      {showPartnerModal && partnerBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPartnerModal(false)} />
          <div className={`relative w-full max-w-md mx-4 rounded-t-3xl sm:rounded-3xl p-6 max-h-[80vh] overflow-y-auto ${isDark ? 'bg-[#1a1f12]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-primary'}`}>Playing Partners</h2>
              <button onClick={() => setShowPartnerModal(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-primary'}`}>
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-primary/60'}`}>
              {partnerBooking.resource_name} • {formatDate(partnerBooking.booking_date)}
            </p>

            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="Partner's name"
                  className={`flex-1 px-4 py-3 rounded-xl text-sm border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-black/5 border-black/10 text-primary placeholder:text-primary/40'}`}
                  onKeyDown={(e) => e.key === 'Enter' && addPartner()}
                />
                <button
                  onClick={addPartner}
                  disabled={!newPartnerName.trim()}
                  className="px-4 py-3 rounded-xl bg-accent text-brand-green font-bold text-sm disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {isLoadingPartners ? (
              <div className={`flex justify-center py-8 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              </div>
            ) : partners.length > 0 ? (
              <div className="space-y-2">
                {partners.map((partner) => (
                  <div key={partner.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                        <span className="material-symbols-outlined text-sm">person</span>
                      </div>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-primary'}`}>{partner.partner_name}</span>
                    </div>
                    <button
                      onClick={() => removePartner(partner.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/10 text-primary/60'}`}
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-center py-8 text-sm ${isDark ? 'text-white/40' : 'text-primary/40'}`}>
                No partners added yet
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuickAction: React.FC<{icon: string; label: string; onClick: () => void; delay: string; isDark: boolean}> = ({ icon, label, onClick, delay, isDark }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 min-w-[80px] group focus:outline-none"
    style={{animationDelay: delay}}
    aria-label={label}
  >
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-active:scale-95 transition-all shadow-lg group-focus:ring-2 group-focus:ring-accent ${isDark ? 'glass-button border border-white/10 text-white group-hover:bg-white/10' : 'bg-white border border-black/5 text-brand-green group-hover:bg-black/5'}`}>
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-primary/70'}`}>{label}</span>
  </button>
);

export default Dashboard;
