import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, Booking } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../components/Toast';
import GlassRow from '../../components/GlassRow';
import DateButton from '../../components/DateButton';
import WelcomeBanner from '../../components/WelcomeBanner';
import { formatDateShort, getTodayString } from '../../utils/dateUtils';
import { BookingCardSkeleton, SkeletonList } from '../../components/skeletons';
import { EmptyBookings } from '../../components/EmptyState';
import { getBaseTier } from '../../utils/permissions';


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
  title: string;
  event_date: string;
  start_time: string;
  location: string;
  category: string;
}

interface DBWellnessEnrollment {
  id: number;
  class_id: number;
  user_email: string;
  status: string;
  title: string;
  date: string;
  time: string;
  instructor: string;
  duration: string;
  category: string;
}

const formatTime12 = (time24: string): string => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const formatDate = (dateStr: string): string => {
  return formatDateShort(dateStr);
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, addBooking, deleteBooking } = useData();
  const { effectiveTheme } = useTheme();
  const { showToast } = useToast();
  const isDark = effectiveTheme === 'dark';
  
  const [dbBookings, setDbBookings] = useState<DBBooking[]>([]);
  const [dbRSVPs, setDbRSVPs] = useState<DBRSVP[]>([]);
  const [dbWellnessEnrollments, setDbWellnessEnrollments] = useState<DBWellnessEnrollment[]>([]);
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
        const [bookingsRes, rsvpsRes, wellnessRes] = await Promise.all([
          fetch(`/api/bookings?user_email=${encodeURIComponent(user.email)}`),
          fetch(`/api/rsvps?user_email=${encodeURIComponent(user.email)}`),
          fetch(`/api/wellness-enrollments?user_email=${encodeURIComponent(user.email)}`)
        ]);
        
        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          setDbBookings(bookings);
        }
        
        if (rsvpsRes.ok) {
          const rsvps = await rsvpsRes.json();
          setDbRSVPs(rsvps);
        }
        
        if (wellnessRes.ok) {
          const enrollments = await wellnessRes.json();
          setDbWellnessEnrollments(enrollments);
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
      title: r.title || 'Event',
      resourceType: 'event',
      date: formatDate(r.event_date),
      time: formatTime12(r.start_time),
      endTime: '',
      details: r.location || '',
      sortKey: `${r.event_date}T${r.start_time}`,
      raw: r
    })),
    ...dbWellnessEnrollments.map(w => ({
      id: `wellness-${w.id}`,
      dbId: w.id,
      classId: w.class_id,
      type: 'wellness' as const,
      title: w.title || 'Wellness Class',
      resourceType: 'wellness_class',
      date: formatDate(w.date),
      time: w.time,
      endTime: '',
      details: `${w.category} with ${w.instructor}`,
      sortKey: `${w.date}T${w.time}`,
      raw: w
    }))
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const todayStr = getTodayString();
  
  const upcomingItems = allItems.filter(item => {
    let itemDate: string | undefined;
    if (item.type === 'booking') {
      itemDate = (item.raw as DBBooking).booking_date.split('T')[0];
    } else if (item.type === 'rsvp') {
      itemDate = (item.raw as DBRSVP).event_date.split('T')[0];
    } else if (item.type === 'wellness') {
      itemDate = (item.raw as DBWellnessEnrollment).date.split('T')[0];
    }
    return itemDate && itemDate >= todayStr;
  });

  const nextItem = upcomingItems[0];
  const laterItems = upcomingItems.slice(1);

  const getIconForType = (type: string) => {
    switch(type) {
      case 'simulator': return 'sports_golf';
      case 'conference_room': return 'meeting_room';
      case 'wellness_room': return 'spa';
      case 'wellness_class': return 'self_improvement';
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
        showToast('Booking cancelled successfully', 'success');
      } else {
        showToast('Failed to cancel booking', 'error');
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      showToast('Failed to cancel booking', 'error');
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
        showToast('RSVP cancelled', 'success');
      } else {
        showToast('Failed to cancel RSVP', 'error');
      }
    } catch (err) {
      console.error('Error cancelling RSVP:', err);
      showToast('Failed to cancel RSVP', 'error');
    }
  };

  const handleCancelWellness = async (classId: number) => {
    if (!window.confirm("Are you sure you want to cancel this enrollment?")) return;
    if (!user?.email) return;
    
    try {
      const res = await fetch(`/api/wellness-enrollments/${classId}/${encodeURIComponent(user.email)}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setDbWellnessEnrollments(prev => prev.filter(w => w.class_id !== classId));
        showToast('Enrollment cancelled', 'success');
      } else {
        showToast('Failed to cancel enrollment', 'error');
      }
    } catch (err) {
      console.error('Error cancelling enrollment:', err);
      showToast('Failed to cancel enrollment', 'error');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTierBadgeStyle = (tier: string | undefined) => {
    const t = (tier || '').toLowerCase();
    if (t === 'vip' || t === 'premium') {
      return 'bg-amber-400 text-amber-900';
    } else if (t === 'core') {
      return 'bg-brand-green text-white';
    }
    return 'bg-gray-400 text-gray-900';
  };

  const formatLastVisit = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="px-6 pt-4 pb-32 font-sans relative min-h-full">
      {/* Welcome banner for new members */}
      <WelcomeBanner />
      
      <div className="mb-6">
        <div className="flex items-center gap-3 animate-pop-in">
          <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-primary'}`}>
            {getGreeting()}, {user?.name.split(' ')[0]}
          </h1>
          {user?.tier && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTierBadgeStyle(user.tier)}`}>
              {getBaseTier(user.tier)}
            </span>
          )}
        </div>
        <p className={`text-sm font-medium mt-1 animate-pop-in ${isDark ? 'text-white/60' : 'text-primary/60'}`} style={{animationDelay: '0.1s'}}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Card - Liquid Glass */}
      <div className={`mb-6 p-5 rounded-3xl animate-pop-in backdrop-blur-xl border shadow-lg shadow-black/5 ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/10 border-white/20'}`} style={{animationDelay: '0.12s'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm ${isDark ? 'bg-white/20' : 'bg-white/30'}`}>
              <span className="material-symbols-outlined text-brand-green text-3xl drop-shadow-sm">schedule</span>
            </div>
            <div>
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{user?.lifetimeVisits || 0}</p>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Lifetime Visits</p>
            </div>
          </div>
        </div>
        {user?.lastBookingDate && (
          <p className={`mt-4 pt-3 text-xs border-t ${isDark ? 'border-white/15 text-white/50' : 'border-white/30 text-primary/50'}`}>
            Last visited: {formatLastVisit(user.lastBookingDate)}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className={`rounded-3xl p-6 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
            <div className={`animate-pulse h-6 w-24 rounded mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
            <div className={`animate-pulse h-8 w-2/3 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
            <div className={`animate-pulse h-5 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          </div>
          <SkeletonList count={3} Component={BookingCardSkeleton} isDark={isDark} />
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
              <div className={`relative overflow-hidden rounded-3xl p-6 flex items-center justify-between group backdrop-blur-xl border shadow-lg shadow-black/5 ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/10 border-white/20'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm ${isDark ? 'bg-white/20' : 'bg-white/30'}`}>
                    <span className="material-symbols-outlined text-brand-green text-3xl drop-shadow-sm">calendar_month</span>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-primary'}`}>Upcoming Bookings</h2>
                    <p className={`text-sm ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Ready to plan your day?</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/book')} 
                  className="w-14 h-14 rounded-full bg-[#E7E7DC] flex items-center justify-center text-[#293515] shadow-glow active:scale-90 transition-transform focus:ring-2 focus:ring-accent focus:outline-none"
                  aria-label="Make a new booking"
                >
                  <span className="material-symbols-outlined text-2xl">add</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-8 animate-pop-in" style={{animationDelay: '0.15s'}}>
            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-primary/60'}`}>Upcoming</h3>
              </div>
              <div className="space-y-3">
                {laterItems.length > 0 ? laterItems.map((item, idx) => {
                  let actions;
                  if (item.type === 'booking') {
                    actions = [{ icon: 'close', label: 'Cancel', onClick: () => handleCancelBooking(item.dbId) }];
                  } else if (item.type === 'rsvp') {
                    actions = [{ icon: 'close', label: 'Cancel RSVP', onClick: () => handleCancelRSVP((item.raw as DBRSVP).event_id) }];
                  } else {
                    actions = [{ icon: 'close', label: 'Cancel', onClick: () => handleCancelWellness((item.raw as DBWellnessEnrollment).class_id) }];
                  }
                  return (
                    <GlassRow 
                      key={item.id} 
                      title={item.title} 
                      subtitle={`${item.date} • ${item.details}`} 
                      icon={getIconForType(item.resourceType)} 
                      color={isDark ? "text-[#E7E7DC]" : "text-primary"}
                      actions={actions}
                      delay={`${0.3 + (idx * 0.1)}s`}
                    />
                  );
                }) : (
                  <EmptyBookings onBook={() => navigate('/book')} />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
