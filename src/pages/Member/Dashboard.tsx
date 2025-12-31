import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, Booking } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageReady } from '../../contexts/PageReadyContext';
import { useToast } from '../../components/Toast';
import GlassRow from '../../components/GlassRow';
import DateButton from '../../components/DateButton';
import WelcomeBanner from '../../components/WelcomeBanner';
import { formatDateShort, getTodayString, getPacificHour, CLUB_TIMEZONE, formatDateTimePacific } from '../../utils/dateUtils';
import { DashboardSkeleton } from '../../components/skeletons';
import { getBaseTier, isFoundingMember } from '../../utils/permissions';
import { getTierColor } from '../../utils/tierUtils';
import TierBadge from '../../components/TierBadge';
import TagBadge from '../../components/TagBadge';
import HubSpotFormModal from '../../components/HubSpotFormModal';
import PullToRefresh from '../../components/PullToRefresh';
import { useTierPermissions } from '../../hooks/useTierPermissions';
import AnnouncementAlert from '../../components/AnnouncementAlert';
import ClosureAlert from '../../components/ClosureAlert';
import ErrorState from '../../components/ErrorState';
import ModalShell from '../../components/ModalShell';

const GUEST_CHECKIN_FIELDS = [
  { name: 'guest_firstname', label: 'Guest First Name', type: 'text' as const, required: true, placeholder: 'John' },
  { name: 'guest_lastname', label: 'Guest Last Name', type: 'text' as const, required: true, placeholder: 'Smith' },
  { name: 'guest_email', label: 'Guest Email', type: 'email' as const, required: true, placeholder: 'john@example.com' },
  { name: 'guest_phone', label: 'Guest Phone', type: 'tel' as const, required: false, placeholder: '(555) 123-4567' }
];


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

interface DBBookingRequest {
  id: number;
  user_email: string;
  user_name: string | null;
  bay_id: number | null;
  bay_name: string | null;
  bay_preference: string | null;
  request_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  staff_notes: string | null;
  suggested_time: string | null;
  created_at: string;
  calendar_event_id?: string | null;
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
  const { user, actualUser, isViewingAs, addBooking, deleteBooking } = useData();
  const { effectiveTheme } = useTheme();
  
  // Check if admin is viewing as a member
  const isAdminViewingAs = actualUser?.role === 'admin' && isViewingAs;
  const { setPageReady } = usePageReady();
  const { showToast } = useToast();
  const isDark = effectiveTheme === 'dark';
  
  const [dbBookings, setDbBookings] = useState<DBBooking[]>([]);
  const [dbBookingRequests, setDbBookingRequests] = useState<DBBookingRequest[]>([]);
  const [dbRSVPs, setDbRSVPs] = useState<DBRSVP[]>([]);
  const [dbWellnessEnrollments, setDbWellnessEnrollments] = useState<DBWellnessEnrollment[]>([]);
  const [dbConferenceRoomBookings, setDbConferenceRoomBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedBooking, setSelectedBooking] = useState<DBBooking | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [newTime, setNewTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [guestPasses, setGuestPasses] = useState<{ passes_used: number; passes_total: number; passes_remaining: number } | null>(null);
  const [showGuestCheckin, setShowGuestCheckin] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);

  const isStaffOrAdminProfile = user?.role === 'admin' || user?.role === 'staff';
  const { permissions: tierPermissions } = useTierPermissions(user?.tier);

  const fetchUserData = useCallback(async (showLoadingState = true) => {
    if (!user?.email) return;
    
    if (showLoadingState) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      // Build conference room bookings URL with member name and email for proper filtering
      const conferenceRoomParams = new URLSearchParams();
      if (user.name) conferenceRoomParams.set('member_name', user.name);
      if (user.email) conferenceRoomParams.set('member_email', user.email);
      const conferenceRoomUrl = `/api/conference-room-bookings${conferenceRoomParams.toString() ? '?' + conferenceRoomParams.toString() : ''}`;
      
      const results = await Promise.allSettled([
        fetch(`/api/bookings?user_email=${encodeURIComponent(user.email)}`, { credentials: 'include' }),
        fetch(`/api/rsvps?user_email=${encodeURIComponent(user.email)}`, { credentials: 'include' }),
        fetch(`/api/wellness-enrollments?user_email=${encodeURIComponent(user.email)}`, { credentials: 'include' }),
        fetch(`/api/booking-requests?user_email=${encodeURIComponent(user.email)}`, { credentials: 'include' }),
        fetch(conferenceRoomUrl, { credentials: 'include' })
      ]);

      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        setDbBookings(await results[0].value.json());
      } else {
        console.error('Bookings failed to load');
      }

      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        setDbRSVPs(await results[1].value.json());
      }

      if (results[2].status === 'fulfilled' && results[2].value.ok) {
        setDbWellnessEnrollments(await results[2].value.json());
      }
      
      if (results[3].status === 'fulfilled' && results[3].value.ok) {
        setDbBookingRequests(await results[3].value.json());
      }
      
      if (results[4].status === 'fulfilled' && results[4].value.ok) {
        setDbConferenceRoomBookings(await results[4].value.json());
      }
      
    } catch (err) {
      console.error('Critical error fetching user data:', err);
      setError('Some data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (!isLoading) {
      setPageReady(true);
    }
  }, [isLoading, setPageReady]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserData(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchUserData]);

  useEffect(() => {
    if (user?.email && !isStaffOrAdminProfile) {
      fetch(`/api/guest-passes/${encodeURIComponent(user.email)}?tier=${encodeURIComponent(user.tier || 'Social')}`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch guest passes');
          return res.json();
        })
        .then(data => setGuestPasses(data))
        .catch(err => console.error('Error fetching guest passes:', err));
    }
  }, [user?.email, user?.tier, isStaffOrAdminProfile]);

  const handleRefresh = useCallback(async () => {
    await fetchUserData(false);
  }, [fetchUserData]);

  const allItems = [
    ...dbBookings.map(b => ({
      id: `booking-${b.id}`,
      dbId: b.id,
      type: 'booking' as const,
      title: b.resource_name || 'Booking',
      resourceType: b.resource_type || 'simulator',
      date: formatDate(b.booking_date),
      rawDate: b.booking_date.split('T')[0],
      time: formatTime12(b.start_time),
      endTime: formatTime12(b.end_time),
      details: `${formatTime12(b.start_time)} - ${formatTime12(b.end_time)}`,
      sortKey: `${b.booking_date}T${b.start_time}`,
      raw: b
    })),
    ...dbBookingRequests.filter(r => r.status === 'approved').map(r => ({
      id: `request-${r.id}`,
      dbId: r.id,
      type: 'booking_request' as const,
      title: r.bay_name || (r.notes?.includes('Conference room') ? 'Conference Room' : 'Simulator'),
      resourceType: r.notes?.includes('Conference room') ? 'conference_room' : 'simulator',
      date: formatDate(r.request_date),
      rawDate: r.request_date.split('T')[0],
      time: formatTime12(r.start_time),
      endTime: formatTime12(r.end_time),
      details: `${formatTime12(r.start_time)} - ${formatTime12(r.end_time)}`,
      sortKey: `${r.request_date}T${r.start_time}`,
      raw: r
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
    })),
    // Filter out calendar bookings that already exist as DB booking requests (avoid duplicates)
    ...dbConferenceRoomBookings
      .filter(c => {
        // Check if this calendar event already exists as a DB booking (by calendar_event_id)
        const isDuplicate = dbBookingRequests.some(r => 
          r.calendar_event_id === c.calendar_event_id && r.status === 'approved'
        );
        return !isDuplicate;
      })
      .map(c => ({
        id: c.id,
        dbId: c.id,
        type: 'conference_room_calendar' as const,
        title: 'Conference Room',
        resourceType: 'conference_room',
        date: formatDate(c.request_date),
        rawDate: c.request_date.split('T')[0],
        time: formatTime12(c.start_time),
        endTime: formatTime12(c.end_time),
        details: `${formatTime12(c.start_time)} - ${formatTime12(c.end_time)}`,
        sortKey: `${c.request_date}T${c.start_time}`,
        raw: c,
        source: 'calendar'
      }))
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const todayStr = getTodayString();
  
  const upcomingItems = allItems.filter(item => {
    let itemDate: string | undefined;
    if (item.type === 'booking') {
      itemDate = (item.raw as DBBooking).booking_date.split('T')[0];
    } else if (item.type === 'booking_request') {
      itemDate = (item.raw as DBBookingRequest).request_date.split('T')[0];
    } else if (item.type === 'rsvp') {
      itemDate = (item.raw as DBRSVP).event_date.split('T')[0];
    } else if (item.type === 'wellness') {
      itemDate = (item.raw as DBWellnessEnrollment).date.split('T')[0];
    } else if (item.type === 'conference_room_calendar') {
      itemDate = (item.raw as any).request_date.split('T')[0];
    }
    return itemDate && itemDate >= todayStr;
  });

  // Separate bookings from events/wellness (include both confirmed bookings, approved requests, and calendar conference room bookings)
  const upcomingBookings = upcomingItems.filter(item => item.type === 'booking' || item.type === 'booking_request' || item.type === 'conference_room_calendar');
  const upcomingEventsWellness = upcomingItems.filter(item => item.type === 'rsvp' || item.type === 'wellness');

  // Next booking card shows only golf/conference bookings
  const nextBooking = upcomingBookings[0];
  
  // Upcoming section shows events and wellness enrollments
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

  const handleCancelBooking = (bookingId: number, bookingType: 'booking' | 'booking_request') => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Booking",
      message: "Are you sure you want to cancel this booking?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          let res;
          if (bookingType === 'booking') {
            // Pass acting_as_email for admin "View As" mode
            res = await fetch(`/api/bookings/${bookingId}/member-cancel`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(isAdminViewingAs ? { acting_as_email: user?.email } : {})
            });
            if (res.ok) {
              setDbBookings(prev => prev.filter(b => b.id !== bookingId));
            }
          } else {
            // Pass acting_as_email for admin "View As" mode
            res = await fetch(`/api/booking-requests/${bookingId}/member-cancel`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(isAdminViewingAs ? { acting_as_email: user?.email } : {})
            });
            if (res.ok) {
              setDbBookingRequests(prev => prev.map(r => 
                r.id === bookingId ? { ...r, status: 'cancelled' } : r
              ));
            }
          }
          if (res.ok) {
            setSelectedBooking(null);
            showToast('Booking cancelled successfully', 'success');
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Failed to cancel booking', 'error');
          }
        } catch (err) {
          showToast('Failed to cancel booking', 'error');
        }
      }
    });
  };

  const handleCancelRSVP = (eventId: number) => {
    if (!user?.email) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Cancel RSVP",
      message: "Are you sure you want to cancel your RSVP?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/rsvps/${eventId}/${encodeURIComponent(user.email)}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          if (res.ok) {
            setDbRSVPs(prev => prev.filter(r => r.event_id !== eventId));
            showToast('RSVP cancelled', 'success');
          } else {
            showToast('Failed to cancel RSVP', 'error');
          }
        } catch (err) {
          showToast('Failed to cancel RSVP', 'error');
        }
      }
    });
  };

  const handleCancelWellness = (classId: number) => {
    if (!user?.email) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Cancel Enrollment",
      message: "Are you sure you want to cancel this enrollment?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/wellness-enrollments/${classId}/${encodeURIComponent(user.email)}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          if (res.ok) {
            setDbWellnessEnrollments(prev => prev.filter(w => w.class_id !== classId));
            showToast('Enrollment cancelled', 'success');
          } else {
            showToast('Failed to cancel enrollment', 'error');
          }
        } catch (err) {
          showToast('Failed to cancel enrollment', 'error');
        }
      }
    });
  };

  const getGreeting = () => {
    const hour = getPacificHour();
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
    return formatDateTimePacific(dateStr);
  };

  if (isLoading) {
    return <DashboardSkeleton isDark={isDark} />;
  }

  if (error) {
    return (
      <div className="px-6 pt-4 min-h-full">
        <ErrorState
          title="Unable to load dashboard"
          message={error}
          onRetry={() => fetchUserData()}
        />
      </div>
    );
  }

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh} className="h-full overflow-y-auto">
      <div className="px-6 pt-4 pb-32 font-sans relative min-h-full">
        <WelcomeBanner />
        <ClosureAlert />
        <AnnouncementAlert />
        
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
            {new Date().toLocaleDateString('en-US', { timeZone: CLUB_TIMEZONE, weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Membership Card - only show for regular members */}
        {!isStaffOrAdminProfile && (() => {
          const tierColors = getTierColor(user?.tier || 'Social');
          const cardBgColor = tierColors.bg;
          const cardTextColor = tierColors.text;
          const baseTier = getBaseTier(user?.tier || 'Social');
          const useDarkLogo = ['Social', 'Premium', 'VIP'].includes(baseTier);
          return (
            <div 
              onClick={() => setIsCardOpen(true)} 
              className="relative h-48 w-full rounded-[1.5rem] overflow-hidden cursor-pointer transform transition-transform active:scale-95 shadow-layered group animate-pop-in mb-6"
              style={{animationDelay: '0.11s'}}
            >
              <div className="absolute inset-0" style={{ backgroundColor: cardBgColor }}></div>
              <div className="absolute inset-0 bg-glossy opacity-50"></div>
              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <img src={useDarkLogo ? "/assets/logos/monogram-dark.webp" : "/assets/logos/monogram-white.webp"} className="w-8 h-8 opacity-90" alt="" />
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${cardTextColor}99` }}>Even House</span>
                    {(user?.tags || []).map((tag) => (
                      <TagBadge key={tag} tag={tag} size="sm" />
                    ))}
                    {!user?.tags?.length && isFoundingMember(user?.tier || '', user?.isFounding) && (
                      <TagBadge tag="Founding Member" size="sm" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TierBadge tier={user?.tier || 'Social'} size="sm" />
                  </div>
                  <h3 className="text-xl font-bold tracking-wide" style={{ color: cardTextColor }}>{user?.name}</h3>
                  {user?.joinDate && (
                    <p className="text-xs mt-2" style={{ color: `${cardTextColor}80` }}>Joined {user.joinDate}</p>
                  )}
                  {user?.lifetimeVisits !== undefined && (
                    <p className="text-xs" style={{ color: `${cardTextColor}80` }}>{user.lifetimeVisits} {user.lifetimeVisits === 1 ? 'golf booking' : 'golf bookings'}</p>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm z-20">
                <span className="font-bold text-sm text-white">View Membership Details</span>
              </div>
            </div>
          );
        })()}

        {/* Guest Passes - only show for regular members with passes */}
        {!isStaffOrAdminProfile && guestPasses && guestPasses.passes_remaining > 0 && (
          <div className={`mb-6 p-5 rounded-3xl animate-pop-in backdrop-blur-xl border shadow-lg shadow-black/5 ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/10 border-white/20'}`} style={{animationDelay: '0.115s'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-lg ${isDark ? 'opacity-60' : 'text-primary/60'}`}>group_add</span>
                <span className={`text-sm font-medium ${isDark ? '' : 'text-primary'}`}>Guest Passes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isDark ? 'text-accent' : 'text-brand-green'}`}>{guestPasses.passes_remaining}</span>
                <span className={`text-xs ${isDark ? 'opacity-50' : 'text-primary/50'}`}>/ {guestPasses.passes_total}</span>
              </div>
            </div>
            <button
              onClick={() => setShowGuestCheckin(true)}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-accent/20 hover:bg-accent/30 text-accent' : 'bg-brand-green/10 hover:bg-brand-green/20 text-brand-green'}`}
            >
              <span className="material-symbols-outlined text-lg">confirmation_number</span>
              Check In a Guest
            </button>
          </div>
        )}

        {error ? (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      ) : (
        <>
          {/* Upcoming Booking Card - Golf/Conference Room only */}
          <div className="mb-8 animate-pop-in" style={{animationDelay: '0.15s'}}>
            {nextBooking ? (
              <div className={`relative overflow-hidden rounded-3xl p-6 shadow-glow group ${isDark ? 'bg-gradient-to-br from-[#1a1f12] to-[#0f120a] text-white border border-white/10' : 'bg-gradient-to-br from-[#E7E7DC] to-[#d4d4cb] text-brand-green'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="material-symbols-outlined text-[120px]">{getIconForType(nextBooking.resourceType)}</span>
                </div>
                <div className="relative z-10">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border ${isDark ? 'bg-white/10 border-white/20' : 'bg-brand-green/10 border-brand-green/10'}`}>Next Booking</span>
                  <h2 className="text-2xl font-bold leading-tight mb-1">{nextBooking.title}</h2>
                  <p className="text-sm font-medium opacity-80 mb-1">{nextBooking.date}</p>
                  <p className="text-sm font-medium opacity-60 mb-6">{nextBooking.details}</p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/book?reschedule=${nextBooking.dbId}&date=${nextBooking.rawDate}`)}
                      className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 focus:ring-2 focus:ring-accent focus:outline-none ${isDark ? 'bg-accent text-primary' : 'bg-brand-green text-white'}`}
                      aria-label="Reschedule booking"
                    >
                      <span className="material-symbols-outlined text-lg">event_repeat</span>
                      Reschedule
                    </button>
                    <button 
                      onClick={() => handleCancelBooking(nextBooking.dbId, nextBooking.type)}
                      className={`w-12 flex items-center justify-center rounded-xl transition-colors focus:ring-2 focus:ring-accent focus:outline-none ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/80 border border-white/20' : 'bg-white/50 hover:bg-white text-brand-green border border-brand-green/10'}`}
                      aria-label="Cancel booking"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`relative overflow-hidden rounded-3xl p-6 flex items-center justify-between group backdrop-blur-xl border shadow-lg shadow-black/5 ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/10 border-white/20'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm ${isDark ? 'bg-white/20' : 'bg-white/30'}`}>
                    <span className="material-symbols-outlined text-brand-green dark:text-white text-3xl drop-shadow-sm">sports_golf</span>
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

          {/* Upcoming Events & Wellness Section */}
          <div className="space-y-8 animate-pop-in" style={{animationDelay: '0.15s'}}>
            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-primary/60'}`}>Upcoming Events & Wellness</h3>
              </div>
              <div className="space-y-3">
                {upcomingEventsWellness.length > 0 ? upcomingEventsWellness.map((item, idx) => {
                  let actions;
                  if (item.type === 'rsvp') {
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
                  <div className="flex flex-col items-center justify-center text-center py-12 px-6 animate-pop-in">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-bone to-secondary flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/5 to-accent/10 animate-pulse" style={{ animationDuration: '3s' }} />
                        <span className="material-symbols-outlined text-5xl text-primary/60 dark:text-white/60">self_improvement</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-primary dark:text-white mb-2">No upcoming events</h3>
                    <p className="text-sm text-primary/60 dark:text-white/60 max-w-[280px] mb-4">
                      RSVP to events or enroll in wellness classes to see them here.
                    </p>
                    <button
                      onClick={() => navigate('/member-wellness')}
                      className="inline-flex items-center gap-2 px-6 py-3 text-base bg-primary dark:bg-accent text-white dark:text-brand-green rounded-2xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Book Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </PullToRefresh>

    <ModalShell 
      isOpen={!!confirmModal} 
      onClose={() => setConfirmModal(null)}
      title={confirmModal?.title || ''}
      size="sm"
    >
      {confirmModal && (
        <div className="p-6">
          <p className={`mb-6 text-sm ${isDark ? 'opacity-70' : 'opacity-70'}`}>{confirmModal.message}</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setConfirmModal(null)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Keep it
            </button>
            <button 
              onClick={confirmModal.onConfirm}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      )}
    </ModalShell>

    {/* Guest Check-In Modal */}
    <HubSpotFormModal
      isOpen={showGuestCheckin}
      onClose={() => setShowGuestCheckin(false)}
      formType="guest-checkin"
      title="Guest Check-In"
      subtitle="Register your guest for today's visit."
      fields={GUEST_CHECKIN_FIELDS}
      submitButtonText="Check In Guest"
      additionalFields={{
        member_name: user?.name || '',
        member_email: user?.email || ''
      }}
      onSuccess={async () => {
        try {
          const res = await fetch(`/api/guest-passes/${encodeURIComponent(user?.email || '')}?tier=${encodeURIComponent(user?.tier || 'Social')}`, { credentials: 'include' });
          if (!res.ok) throw new Error('Failed to refresh guest passes');
          const data = await res.json();
          setGuestPasses(data);
        } catch (err) {
          console.error('Error refreshing guest passes:', err);
        }
      }}
    />

    {/* Membership Details Modal */}
    <ModalShell 
      isOpen={isCardOpen && !!user} 
      onClose={() => setIsCardOpen(false)}
      showCloseButton={false}
      size="sm"
      className="!bg-transparent !border-0 !shadow-none"
    >
      {user && (() => {
        const tierColors = getTierColor(user.tier || 'Social');
        const cardBgColor = isStaffOrAdminProfile ? '#293515' : tierColors.bg;
        const cardTextColor = isStaffOrAdminProfile ? '#F2F2EC' : tierColors.text;
        const baseTier = getBaseTier(user.tier || 'Social');
        const useDarkLogo = !isStaffOrAdminProfile && ['Social', 'Premium', 'VIP'].includes(baseTier);
        return (
          <div className="flex flex-col items-center">
            <div className="w-full rounded-[2rem] relative overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: cardBgColor }}>
              
              {/* Close Button */}
              <button onClick={() => setIsCardOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: `${cardTextColor}33`, color: cardTextColor }}>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>

              {/* Header with Logo */}
              <div className="pt-6 pb-4 px-6 flex justify-center" style={{ backgroundColor: cardBgColor }}>
                <img src={useDarkLogo ? "/assets/logos/monogram-dark.webp" : "/assets/logos/monogram-white.webp"} className="w-12 h-12" alt="" />
              </div>
              
              {/* Member Info */}
              <div className="px-6 pb-6 text-center" style={{ backgroundColor: cardBgColor }}>
                <h2 className="text-2xl font-bold mb-3" style={{ color: cardTextColor }}>{user.name}</h2>
                
                <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                  <TierBadge tier={user.tier || 'Social'} size="md" />
                </div>
                {((user.tags || []).length > 0 || isFoundingMember(user.tier || '', user.isFounding)) && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {(user.tags || []).map((tag) => (
                      <TagBadge key={tag} tag={tag} size="sm" />
                    ))}
                    {!user.tags?.length && isFoundingMember(user.tier || '', user.isFounding) && (
                      <TagBadge tag="Founding Member" size="sm" />
                    )}
                  </div>
                )}
              </div>

              {/* Benefits Section */}
              <div className="px-6 pb-6" style={{ backgroundColor: cardBgColor }}>
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: `${cardTextColor}10` }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-3" style={{ color: cardTextColor }}>Membership Benefits</h3>
                  
                  {user.joinDate && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>event</span>
                        <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Member Since</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: cardTextColor }}>{user.joinDate}</span>
                    </div>
                  )}

                  {user.lastBookingDate && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>schedule</span>
                        <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Last Visited</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: cardTextColor }}>{formatLastVisit(user.lastBookingDate)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>calendar_month</span>
                      <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Advance Booking</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: cardTextColor }}>
                      {tierPermissions.unlimitedAccess ? 'Unlimited' : `${tierPermissions.advanceBookingDays} days`}
                    </span>
                  </div>
                  
                  {tierPermissions.canBookSimulators && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>sports_golf</span>
                        <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Daily Sim Time</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: cardTextColor }}>
                        {tierPermissions.unlimitedAccess ? 'Unlimited' : `${tierPermissions.dailySimulatorMinutes} min`}
                      </span>
                    </div>
                  )}
                  
                  {guestPasses && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>group_add</span>
                        <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Guest Passes</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: cardTextColor }}>
                        {guestPasses.passes_remaining} / {guestPasses.passes_total}
                      </span>
                    </div>
                  )}

                  {user.mindbodyClientId && (
                    <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: `1px solid ${cardTextColor}20` }}>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-base opacity-70" style={{ color: cardTextColor }}>badge</span>
                        <span className="text-sm opacity-80" style={{ color: cardTextColor }}>Mindbody ID</span>
                      </div>
                      <span className="text-sm font-mono font-semibold" style={{ color: cardTextColor }}>{user.mindbodyClientId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        );
      })()}
    </ModalShell>
  </>
  );
};

export default Dashboard;
