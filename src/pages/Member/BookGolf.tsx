import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageReady } from '../../contexts/PageReadyContext';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../lib/apiRequest';
import DateButton from '../../components/DateButton';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';
import PullToRefresh from '../../components/PullToRefresh';
import { haptic } from '../../utils/haptics';
import { playSound } from '../../utils/sounds';
import { useTierPermissions } from '../../hooks/useTierPermissions';
import { canAccessResource } from '../../services/tierService';
import { getDateString, formatDateShort, getPacificDateParts } from '../../utils/dateUtils';
import WalkingGolferSpinner from '../../components/WalkingGolferSpinner';
import ModalShell from '../../components/ModalShell';


interface APIResource {
  id: number;
  name: string;
  type: string;
  description: string;
  capacity: number;
}

interface APISlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  startTime24: string;
  endTime24: string;
  label: string;
  available: boolean;
  availableResourceDbIds: number[];
}

interface Resource {
  id: string;
  dbId: number;
  name: string;
  meta: string;
  badge?: string;
  icon?: string;
  image?: string;
}

interface BookingRequest {
  id: number;
  user_email: string;
  user_name: string;
  bay_id: number | null;
  bay_name: string | null;
  bay_preference: string | null;
  request_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'confirmed' | 'attended' | 'no_show' | 'declined' | 'cancelled';
  staff_notes: string | null;
  suggested_time: string | null;
  created_at: string;
  reschedule_booking_id?: number | null;
}

interface Closure {
  id: number;
  title: string | null;
  reason: string | null;
  startDate: string;
  startTime: string | null;
  endDate: string;
  endTime: string | null;
  affectedAreas: string;
  isActive: boolean;
}

const getStatusColor = (status: string, isDark: boolean): string => {
  switch (status) {
    case 'pending': return isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-500/20 text-yellow-700';
    case 'approved': 
    case 'confirmed': return isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-500/20 text-green-700';
    case 'attended': return isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/20 text-blue-700';
    case 'declined': return isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-500/20 text-red-700';
    case 'no_show': return isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-500/20 text-orange-700';
    case 'cancelled': return isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/20 text-gray-500';
    default: return isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/20 text-gray-500';
  }
};

const formatTime12 = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const generateDates = (advanceDays: number = 7): { label: string; date: string; day: string; dateNum: string }[] => {
  const dates = [];
  const { year, month, day } = getPacificDateParts();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Show today + advanceDays (today doesn't count toward the advance booking window)
  for (let i = 0; i <= advanceDays; i++) {
    const d = new Date(year, month - 1, day + i);
    const dayName = days[d.getDay()];
    const dateNum = d.getDate().toString();
    dates.push({
      label: `${dayName} ${dateNum}`,
      date: getDateString(d),
      day: dayName,
      dateNum: dateNum
    });
  }
  return dates;
};

const doesClosureAffectResource = (affectedAreas: string, resourceType: 'simulator' | 'conference'): boolean => {
  if (!affectedAreas) return false;
  
  const normalized = affectedAreas.toLowerCase().trim();
  if (normalized === 'entire_facility') return true;
  
  let parts: string[];
  if (normalized.startsWith('[')) {
    try {
      parts = JSON.parse(affectedAreas).map((p: string) => p.toLowerCase().trim());
    } catch {
      parts = [normalized];
    }
  } else {
    parts = normalized.split(',').map(p => p.trim());
  }
  
  if (resourceType === 'simulator') {
    return parts.some(part => 
      part === 'all_bays' || 
      part.startsWith('bay_') || 
      part.startsWith('bay ') ||
      /^bay\s*\d+$/.test(part)
    );
  } else if (resourceType === 'conference') {
    return parts.some(part => 
      part === 'conference_room' || 
      part === 'conference room'
    );
  }
  
  return false;
};

const BookGolf: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addBooking, user, viewAsUser, actualUser, isViewingAs } = useData();
  const { effectiveTheme } = useTheme();
  const { setPageReady } = usePageReady();
  const { showToast } = useToast();
  const isDark = effectiveTheme === 'dark';
  const initialTab = searchParams.get('tab') === 'conference' ? 'conference' : 'simulator';
  const [activeTab, setActiveTab] = useState<'simulator' | 'conference' | 'my-requests'>(initialTab);
  const [duration, setDuration] = useState<number>(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showViewAsConfirm, setShowViewAsConfirm] = useState(false);
  const [myRequests, setMyRequests] = useState<BookingRequest[]>([]);
  const [previousTab, setPreviousTab] = useState<'simulator' | 'conference'>(initialTab as 'simulator' | 'conference');
  const [closures, setClosures] = useState<Closure[]>([]);
  const [expandedHour, setExpandedHour] = useState<string | null>(null);
  const [hasUserSelectedDuration, setHasUserSelectedDuration] = useState(false);
  
  const [rescheduleBookingId, setRescheduleBookingId] = useState<number | null>(null);
  const [originalBooking, setOriginalBooking] = useState<BookingRequest | null>(null);
  const [existingDayBooking, setExistingDayBooking] = useState<BookingRequest | null>(null);
  
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const baySelectionRef = useRef<HTMLDivElement>(null);
  const requestButtonRef = useRef<HTMLDivElement>(null);

  const effectiveUser = viewAsUser || user;
  
  // Check if admin is viewing as a member
  const isAdminViewingAs = actualUser?.role === 'admin' && isViewingAs;

  useEffect(() => {
    if (!isLoading) {
      setPageReady(true);
    }
  }, [isLoading, setPageReady]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'conference') {
      setActiveTab('conference');
      setPreviousTab('conference');
    } else if (tab === 'simulator') {
      setActiveTab('simulator');
      setPreviousTab('simulator');
    }
    
    const rescheduleParam = searchParams.get('reschedule');
    if (rescheduleParam) {
      const bookingId = parseInt(rescheduleParam, 10);
      if (!isNaN(bookingId)) {
        setRescheduleBookingId(bookingId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchOriginalBooking = async () => {
      if (!rescheduleBookingId || !effectiveUser?.email) return;
      
      try {
        const { ok, data } = await apiRequest<BookingRequest[]>(
          `/api/booking-requests?user_email=${encodeURIComponent(effectiveUser.email)}`
        );
        if (ok && data) {
          const booking = data.find(b => b.id === rescheduleBookingId);
          if (booking) {
            setOriginalBooking(booking);
            const dateParam = searchParams.get('date');
            const matchingDate = dateParam ? dates.find(d => d.date === dateParam) : null;
            if (matchingDate) {
              setSelectedDateObj(matchingDate);
            }
          }
        }
      } catch (err) {
        console.error('[BookGolf] Failed to fetch original booking:', err);
      }
    };
    
    fetchOriginalBooking();
  }, [rescheduleBookingId, effectiveUser?.email, dates, searchParams]);

  const { permissions: tierPermissions, loading: tierLoading } = useTierPermissions(effectiveUser?.tier);
  const canBookSimulators = canAccessResource(tierPermissions, 'simulator');
  const canBookConference = canAccessResource(tierPermissions, 'conference');
  const isTierLoaded = Boolean(effectiveUser?.tier) && !tierLoading;
  
  const pendingRequestsCount = myRequests.filter(r => r.status === 'pending').length;
  
  // Generate dates with safe fallback - ensure we always have at least one date
  const dates = useMemo(() => {
    const advanceDays = tierPermissions?.advanceBookingDays ?? 7;
    return generateDates(advanceDays);
  }, [tierPermissions?.advanceBookingDays]);
  
  // Initialize with null to avoid accessing potentially undefined array element
  const [selectedDateObj, setSelectedDateObj] = useState<{ label: string; date: string; day: string; dateNum: string } | null>(null);

  // Sync selectedDateObj when dates array changes (e.g., when user tier loads)
  useEffect(() => {
    if (dates.length > 0 && (!selectedDateObj || !dates.find(d => d.date === selectedDateObj.date))) {
      setSelectedDateObj(dates[0]);
    }
  }, [dates, selectedDateObj]);

  const fetchResources = useCallback(async () => {
    const { ok, data, error } = await apiRequest<APIResource[]>('/api/resources');
    
    if (!ok) {
      showToast('Unable to load data. Please try again.', 'error');
      setError(error || 'Unable to load resources');
      return [];
    }
    
    const typeMap: Record<string, string> = {
      simulator: 'simulator',
      conference: 'conference_room'
    };
    
    const filtered = data!
      .filter(r => r.type === typeMap[activeTab])
      .map(r => ({
        id: `resource-${r.id}`,
        dbId: r.id,
        name: r.name,
        meta: r.description || `Capacity: ${r.capacity}`,
        badge: r.type === 'simulator' ? 'Indoor' : undefined,
        icon: r.type === 'simulator' ? 'golf_course' : r.type === 'conference_room' ? 'meeting_room' : 'person'
      }));
    
    setResources(filtered);
    return filtered;
  }, [activeTab, showToast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources, effectiveUser?.email, effectiveUser?.tier]);

  const fetchAvailability = useCallback(async (resourceList?: Resource[]) => {
    const resourcesToUse = resourceList || resources;
    if (!resourcesToUse || resourcesToUse.length === 0 || !selectedDateObj?.date) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const allSlots: Map<string, { slot: TimeSlot; resourceIds: number[] }> = new Map();
      
      const results = await Promise.allSettled(resourcesToUse.map(async (resource) => {
        const { ok, data: slots } = await apiRequest<APISlot[]>(
          `/api/availability?resource_id=${resource.dbId}&date=${selectedDateObj.date}&duration=${duration}`
        );
        return { resource, ok, slots };
      }));
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.ok && result.value.slots) {
          const { resource, slots } = result.value;
          slots.forEach(slot => {
            if (!slot.available) return;
            
            const key = slot.start_time;
            
            if (allSlots.has(key)) {
              allSlots.get(key)!.resourceIds.push(resource.dbId);
            } else {
              allSlots.set(key, { 
                slot: {
                  id: `slot-${slot.start_time}`,
                  start: formatTime12(slot.start_time),
                  end: formatTime12(slot.end_time),
                  startTime24: slot.start_time,
                  endTime24: slot.end_time,
                  label: `${formatTime12(slot.start_time)} – ${formatTime12(slot.end_time)}`,
                  available: true,
                  availableResourceDbIds: []
                }, 
                resourceIds: [resource.dbId] 
              });
            }
          });
        } else if (result.status === 'rejected') {
          console.error('[BookGolf] Availability API failed:', result.reason);
        }
      });
      
      const sortedSlots = Array.from(allSlots.values())
        .map(({ slot, resourceIds }) => ({
          ...slot,
          availableResourceDbIds: resourceIds
        }))
        .sort((a, b) => a.startTime24.localeCompare(b.startTime24));
      
      setAvailableSlots(sortedSlots);
    } catch (err) {
      console.error('[BookGolf] Error fetching availability:', err);
      showToast('Unable to load data. Please try again.', 'error');
      setError('Unable to load availability');
    } finally {
      setIsLoading(false);
    }
  }, [resources, selectedDateObj, duration, showToast]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability, effectiveUser?.email, effectiveUser?.tier]);

  const fetchMyRequests = useCallback(async () => {
    if (!effectiveUser?.email) return;
    try {
      const { ok, data } = await apiRequest<BookingRequest[]>(
        `/api/booking-requests?user_email=${encodeURIComponent(effectiveUser.email)}`
      );
      if (ok && data) {
        setMyRequests(data);
      }
    } catch (err) {
      console.error('[BookGolf] Failed to fetch booking requests:', err);
    }
  }, [effectiveUser?.email]);

  const fetchClosures = useCallback(async () => {
    try {
      const { ok, data } = await apiRequest<Closure[]>('/api/closures', {
        credentials: 'include'
      });
      if (ok && data) {
        setClosures(data);
      }
    } catch (err) {
      console.error('[BookGolf] Failed to fetch closures:', err);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
    fetchClosures();
  }, [fetchMyRequests, fetchClosures, showConfirmation]);

  // Auto-scroll to time slots when duration is selected by user (not on initial load)
  useEffect(() => {
    if (hasUserSelectedDuration && duration && timeSlotsRef.current && activeTab !== 'my-requests') {
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [hasUserSelectedDuration, duration, activeTab]);

  // Auto-scroll to bay/room selection when a time slot is picked
  useEffect(() => {
    if (selectedSlot && !selectedResource && baySelectionRef.current) {
      setTimeout(() => {
        baySelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [selectedSlot, selectedResource]);

  // Auto-scroll to request button when a bay/room is selected
  useEffect(() => {
    if (selectedSlot && selectedResource && requestButtonRef.current) {
      setTimeout(() => {
        requestButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [selectedSlot, selectedResource]);

  const cancelRescheduleMode = useCallback(() => {
    setRescheduleBookingId(null);
    setOriginalBooking(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('reschedule');
    newParams.delete('date');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const isBookingWithin30Minutes = useCallback((booking: BookingRequest): boolean => {
    if (!booking) return false;
    const { year, month, day, hour, minute } = getPacificDateParts();
    const nowPacific = new Date(year, month - 1, day, hour, minute);
    
    const [bookingYear, bookingMonth, bookingDay] = booking.request_date.split('-').map(Number);
    const [bookingHour, bookingMinute] = booking.start_time.split(':').map(Number);
    const bookingStart = new Date(bookingYear, bookingMonth - 1, bookingDay, bookingHour, bookingMinute);
    
    const diffMs = bookingStart.getTime() - nowPacific.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes <= 30;
  }, []);

  const hasPendingRescheduleRequest = useMemo(() => {
    if (!rescheduleBookingId) return false;
    return myRequests.some(r => 
      r.reschedule_booking_id === rescheduleBookingId && 
      r.status === 'pending'
    );
  }, [myRequests, rescheduleBookingId]);

  const rescheduleTimeError = useMemo(() => {
    if (!rescheduleBookingId || !originalBooking) return null;
    if (isBookingWithin30Minutes(originalBooking)) {
      return 'Cannot reschedule a booking that starts within 30 minutes.';
    }
    return null;
  }, [rescheduleBookingId, originalBooking, isBookingWithin30Minutes]);

  useEffect(() => {
    if (!selectedDateObj?.date || !myRequests.length || activeTab !== 'simulator' || rescheduleBookingId) {
      setExistingDayBooking(null);
      return;
    }
    
    const existingBayBooking = myRequests.find(r => 
      r.request_date === selectedDateObj.date &&
      (r.status === 'approved' || r.status === 'pending') &&
      !r.notes?.includes('Conference room booking')
    );
    
    setExistingDayBooking(existingBayBooking || null);
  }, [selectedDateObj, myRequests, activeTab, rescheduleBookingId]);

  const memberBayBookingForDay = useMemo(() => {
    if (!selectedDateObj?.date || !myRequests.length) return null;
    return myRequests.find(r => 
      r.request_date === selectedDateObj.date &&
      (r.status === 'approved' || r.status === 'pending') &&
      !r.notes?.includes('Conference room booking')
    ) || null;
  }, [selectedDateObj, myRequests]);

  const doTimesOverlap = (
    start1: string, end1: string,
    start2: string, end2: string
  ): boolean => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMinutes(start1), e1 = toMinutes(end1);
    const s2 = toMinutes(start2), e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  };

  const filteredSlotsForConference = useMemo(() => {
    if (activeTab !== 'conference' || !memberBayBookingForDay) {
      return availableSlots;
    }
    return availableSlots.filter(slot => 
      !doTimesOverlap(
        slot.startTime24, 
        slot.endTime24,
        memberBayBookingForDay.start_time,
        memberBayBookingForDay.end_time
      )
    );
  }, [activeTab, memberBayBookingForDay, availableSlots]);

  const handleCancelRequest = async (id: number) => {
    haptic.light();
    const request = myRequests.find(r => r.id === id);
    const wasApproved = request?.status === 'approved';
    try {
      const { ok } = await apiRequest(`/api/booking-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelled_by: effectiveUser?.email })
      });
      
      if (ok) {
        setMyRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
        haptic.success();
        showToast(wasApproved ? 'Booking cancelled' : 'Request cancelled', 'success');
        setTimeout(() => handleRefresh(), 500);
      } else {
        haptic.error();
        showToast('Failed to cancel request', 'error');
      }
    } catch (err) {
      console.error('[BookGolf] Failed to cancel request:', err);
      haptic.error();
      showToast('Failed to cancel request', 'error');
    }
  };

  const getAvailableResourcesForSlot = (slot: TimeSlot): Resource[] => {
    return resources.filter(r => slot.availableResourceDbIds.includes(r.dbId));
  };

  // Handle the actual booking submission
  const submitBooking = async () => {
    if (!selectedSlot || !selectedResource || !effectiveUser || !selectedDateObj) return;
    
    setIsBooking(true);
    setError(null);
    setShowViewAsConfirm(false);
    
    try {
      const { ok, data, error } = await apiRequest('/api/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: effectiveUser.email,
          user_name: effectiveUser.name,
          user_tier: effectiveUser.tier,
          bay_id: selectedResource.dbId,
          request_date: selectedDateObj.date,
          start_time: selectedSlot.startTime24,
          duration_minutes: duration,
          notes: activeTab === 'conference' ? 'Conference room booking' : null,
          ...(rescheduleBookingId ? { reschedule_booking_id: rescheduleBookingId } : {})
        })
      });
      
      if (!ok) {
        if (error?.includes('402') || error?.includes('payment')) {
          setError('Please contact the front desk to complete your booking.');
          haptic.error();
          return;
        }
        throw new Error(error || 'Booking failed');
      }
      
      addBooking({
        id: Date.now().toString(),
        type: 'golf',
        title: selectedResource.name,
        date: selectedDateObj.label,
        time: selectedSlot.start,
        details: `${duration} min`,
        color: 'primary'
      });
      
      haptic.success();
      playSound('bookingConfirmed');
      showToast(
        rescheduleBookingId 
          ? 'Reschedule request submitted! Staff will review shortly.' 
          : 'Booking request sent! We\'ll confirm shortly.', 
        'success'
      );
      setShowConfirmation(true);
      setTimeout(async () => {
        setShowConfirmation(false);
        setSelectedSlot(null);
        setSelectedResource(null);
        if (rescheduleBookingId) {
          cancelRescheduleMode();
        }
        await handleRefresh();
      }, 2500);
    } catch (err: any) {
      haptic.error();
      showToast(err.message || 'Booking failed. Please try again.', 'error');
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedResource || !effectiveUser || !selectedDateObj) return;
    
    // If admin is viewing as member, show confirmation popup first
    if (isAdminViewingAs) {
      setShowViewAsConfirm(true);
      return;
    }
    
    // Otherwise proceed directly
    await submitBooking();
  };

  const canBook = Boolean(
    selectedDateObj && 
    duration && 
    selectedSlot && 
    selectedResource && 
    !isBooking && 
    activeTab !== 'my-requests' &&
    !rescheduleTimeError &&
    !hasPendingRescheduleRequest
  );

  const activeClosures = useMemo(() => {
    if (!selectedDateObj?.date) return [];
    return closures.filter(closure => {
      const selectedDate = selectedDateObj.date;
      if (selectedDate < closure.startDate || selectedDate > closure.endDate) {
        return false;
      }
      return doesClosureAffectResource(closure.affectedAreas, activeTab === 'conference' ? 'conference' : 'simulator');
    });
  }, [closures, selectedDateObj, activeTab]);

  const slotsToDisplay = activeTab === 'conference' ? filteredSlotsForConference : availableSlots;

  const slotsByHour = useMemo(() => {
    const grouped: Record<string, { hourLabel: string; hour24: string; slots: TimeSlot[]; totalAvailable: number }> = {};
    
    slotsToDisplay.forEach(slot => {
      const hour24 = slot.startTime24.split(':')[0];
      const hourNum = parseInt(hour24, 10);
      const period = hourNum >= 12 ? 'PM' : 'AM';
      const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
      const hourLabel = `${hour12}:00 ${period}`;
      
      if (!grouped[hour24]) {
        grouped[hour24] = { hourLabel, hour24, slots: [], totalAvailable: 0 };
      }
      grouped[hour24].slots.push(slot);
      grouped[hour24].totalAvailable = Math.max(grouped[hour24].totalAvailable, slot.availableResourceDbIds.length);
    });
    
    return Object.values(grouped).sort((a, b) => a.hour24.localeCompare(b.hour24));
  }, [slotsToDisplay]);

  const handleRefresh = useCallback(async () => {
    setSelectedSlot(null);
    setSelectedResource(null);
    setExpandedHour(null);
    const newResources = await fetchResources();
    await Promise.all([
      fetchAvailability(newResources),
      fetchMyRequests(),
      fetchClosures()
    ]);
  }, [fetchResources, fetchAvailability, fetchMyRequests, fetchClosures]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <SwipeablePage className="px-6 pt-4 relative min-h-screen">
      <section className="mb-6 pt-2">
        <h1 className={`text-3xl font-bold leading-tight drop-shadow-md ${isDark ? 'text-white' : 'text-primary'}`}>Book</h1>
        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Reserve simulators or conference room.</p>
      </section>

      {rescheduleBookingId && originalBooking && (
        <section className={`mb-4 rounded-xl p-4 border ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-start gap-3">
            <span className={`material-symbols-outlined text-2xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>event_repeat</span>
            <div className="flex-1">
              <h4 className={`font-bold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                Rescheduling Booking
              </h4>
              <p className={`text-sm mt-1 ${isDark ? 'text-blue-300/80' : 'text-blue-700'}`}>
                {originalBooking.bay_name} on {formatDateShort(originalBooking.request_date)} at {formatTime12(originalBooking.start_time)}
              </p>
            </div>
            <button
              onClick={cancelRescheduleMode}
              className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Cancel
            </button>
          </div>
          {rescheduleTimeError && (
            <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
              <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                {rescheduleTimeError}
              </p>
            </div>
          )}
          {hasPendingRescheduleRequest && (
            <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
              <p className={`text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                You already have a pending reschedule request for this booking.
              </p>
            </div>
          )}
        </section>
      )}

      <section className={`mb-8 border-b -mx-6 px-6 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide" role="tablist">
          <TabButton 
            label="Golf Simulator" 
            active={activeTab === 'simulator'} 
            onClick={() => { setPreviousTab('simulator'); setActiveTab('simulator'); }} 
            isDark={isDark} 
          />
          <TabButton 
            label="Conference Room" 
            active={activeTab === 'conference'} 
            onClick={() => { setPreviousTab('conference'); setActiveTab('conference'); }} 
            isDark={isDark} 
          />
          <button
            role="tab"
            aria-selected={activeTab === 'my-requests'}
            onClick={() => setActiveTab('my-requests')}
            className={`relative whitespace-nowrap pb-4 text-sm font-bold transition-all border-b-2 -mb-px ${
              activeTab === 'my-requests'
                ? (isDark ? 'text-white border-accent' : 'text-primary border-accent')
                : (isDark ? 'text-white/50 border-transparent hover:text-white/70' : 'text-primary/50 border-transparent hover:text-primary/70')
            }`}
          >
            My Requests
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-3 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </section>

      {activeTab === 'simulator' && isTierLoaded && !canBookSimulators ? (
        <section className={`rounded-2xl p-6 border text-center glass-card ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <span className="material-symbols-outlined text-4xl text-accent mb-4">lock</span>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-primary'}`}>Upgrade to Book Simulators</h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-primary/60'}`}>
            Golf simulator access is available for Core, Premium, and Corporate members. Upgrade your membership to start booking.
          </p>
          <a 
            href="/membership" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-brand-green rounded-xl font-bold text-sm"
          >
            <span className="material-symbols-outlined text-lg">upgrade</span>
            View Membership Options
          </a>
        </section>
      ) : activeTab === 'conference' && isTierLoaded && !canBookConference ? (
        <section className={`rounded-2xl p-6 border text-center glass-card ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <span className="material-symbols-outlined text-4xl text-accent mb-4">lock</span>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-primary'}`}>Upgrade for Conference Room Access</h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-primary/60'}`}>
            Conference room booking is available for Core, Premium, and Corporate members. Upgrade your membership to start booking.
          </p>
          <a 
            href="/membership" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-brand-green rounded-xl font-bold text-sm"
          >
            <span className="material-symbols-outlined text-lg">upgrade</span>
            View Membership Options
          </a>
        </section>
      ) : activeTab === 'my-requests' ? (
        <div className="space-y-4">
          {myRequests.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl border glass-card ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <span className={`material-symbols-outlined text-5xl mb-4 ${isDark ? 'text-white/30' : 'text-primary/30'}`}>inbox</span>
              <p className={`${isDark ? 'text-white/60' : 'text-primary/60'}`}>No booking requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests
                .filter(request => {
                  if (previousTab === 'conference') {
                    return request.notes?.includes('Conference room booking');
                  }
                  return !request.notes?.includes('Conference room booking');
                })
                .map(request => (
                <div 
                  key={request.id} 
                  className={`rounded-xl p-4 border glass-card ${isDark ? 'border-white/10' : 'border-black/10'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-primary'}`}>
                        {formatDateShort(request.request_date)}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-white/70' : 'text-primary/70'}`}>
                        {formatTime12(request.start_time)} - {formatTime12(request.end_time)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(request.status, isDark)}`}>
                      {request.status}
                    </span>
                  </div>
                  
                  {request.bay_name && (
                    <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-white/70' : 'text-primary/70'}`}>
                      <span className="material-symbols-outlined text-sm">
                        {request.notes?.includes('Conference room booking') ? 'meeting_room' : 'golf_course'}
                      </span>
                      {request.bay_name}
                    </p>
                  )}
                  
                  {request.notes && (
                    <p className={`text-sm mt-2 italic ${isDark ? 'text-white/60' : 'text-primary/60'}`}>"{request.notes}"</p>
                  )}
                  
                  {request.staff_notes && request.status !== 'pending' && (
                    <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                      <p className={`text-xs ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Staff note: {request.staff_notes}</p>
                    </div>
                  )}
                  
                  {request.suggested_time && request.status === 'declined' && (
                    <div className="mt-2 p-2 bg-yellow-500/10 rounded-lg">
                      <p className="text-xs text-yellow-700">Suggested time: {formatTime12(request.suggested_time)}</p>
                    </div>
                  )}
                  
                  {(request.status === 'pending' || request.status === 'approved') && (
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="mt-3 text-sm text-red-500 flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      {request.status === 'pending' ? 'Cancel Request' : 'Cancel Booking'}
                    </button>
                  )}
                </div>
              ))}
              {myRequests.filter(request => {
                if (previousTab === 'conference') {
                  return request.notes?.includes('Conference room booking');
                }
                return !request.notes?.includes('Conference room booking');
              }).length === 0 && (
                <div className={`text-center py-12 rounded-2xl border glass-card ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  <span className={`material-symbols-outlined text-5xl mb-4 ${isDark ? 'text-white/30' : 'text-primary/30'}`}>inbox</span>
                  <p className={`${isDark ? 'text-white/60' : 'text-primary/60'}`}>
                    No {previousTab === 'conference' ? 'conference room' : 'simulator'} requests yet
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 animate-pop-in space-y-6">
          <section className={`rounded-2xl p-4 border glass-card ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-primary/60'}`}>Date & Duration</span>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3 overflow-x-auto py-8 px-3 -mx-3 scrollbar-hide">
                {dates.map((d) => (
                  <DateButton 
                    key={d.date}
                    day={d.day} 
                    date={d.dateNum} 
                    active={selectedDateObj?.date === d.date} 
                    onClick={() => { setSelectedDateObj(d); setExpandedHour(null); }} 
                    isDark={isDark}
                  />
                ))}
              </div>
              <div className={`flex gap-2 p-1 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-black/5'}`}>
                {[30, 60, 90, 120].filter(mins => {
                  const maxMinutes = tierPermissions.dailySimulatorMinutes || 60;
                  // VIP/unlimited gets all options
                  if (maxMinutes >= 999 || tierPermissions.unlimitedAccess) return true;
                  // Premium tiers with extended sessions see durations up to their limit
                  if (tierPermissions.hasExtendedSessions) return mins <= maxMinutes;
                  // Standard tiers (Core) see only their exact limit as the option
                  // Core (60 min) = only 60m option
                  return mins === maxMinutes;
                }).map(mins => (
                  <button 
                    key={mins}
                    onClick={() => { haptic.selection(); setDuration(mins); setExpandedHour(null); setHasUserSelectedDuration(true); }}
                    aria-pressed={duration === mins}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95 focus:ring-2 focus:ring-accent focus:outline-none ${
                      duration === mins 
                      ? 'bg-accent text-[#293515] shadow-glow'
                      : (isDark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-primary/60 hover:bg-black/5 hover:text-primary')
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </section>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {activeClosures.length > 0 && (
            <div className="space-y-3">
              {activeClosures.map(closure => {
                const hasTimeRange = closure.startTime && closure.endTime;
                const isPartialDay = hasTimeRange;
                return (
                  <div 
                    key={closure.id}
                    className={`rounded-xl p-4 border ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-2xl ${isDark ? 'text-red-400' : 'text-red-600'}`}>event_busy</span>
                      <div className="flex-1">
                        <h4 className={`font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                          {closure.title || 'Closure Notice'}
                        </h4>
                        {hasTimeRange && (
                          <p className={`text-sm mt-1 ${isDark ? 'text-red-300/80' : 'text-red-700'}`}>
                            {formatTime12(closure.startTime!)} - {formatTime12(closure.endTime!)}
                          </p>
                        )}
                        {closure.reason && (
                          <p className={`text-sm mt-1 ${isDark ? 'text-red-300/70' : 'text-red-600'}`}>
                            {closure.reason === 'Internal calendar event' ? 'Private event' : closure.reason}
                          </p>
                        )}
                        {isPartialDay && (
                          <p className={`text-xs mt-2 font-medium ${isDark ? 'text-red-400/80' : 'text-red-700'}`}>
                            Limited availability - see times below
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'simulator' && existingDayBooking && !rescheduleBookingId && (
            <section className={`rounded-xl p-4 border ${isDark ? 'bg-accent/10 border-accent/30' : 'bg-accent/5 border-accent/30'}`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined text-2xl text-accent`}>event_available</span>
                <div className="flex-1">
                  <h4 className={`font-bold ${isDark ? 'text-white' : 'text-primary'}`}>
                    You already have a booking for {formatDateShort(existingDayBooking.request_date)}
                  </h4>
                  <p className={`text-sm mt-1 ${isDark ? 'text-white/80' : 'text-primary/80'}`}>
                    {existingDayBooking.bay_name} - {formatTime12(existingDayBooking.start_time)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  haptic.medium();
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('reschedule', existingDayBooking.id.toString());
                  newParams.set('date', existingDayBooking.request_date);
                  setSearchParams(newParams, { replace: true });
                }}
                className="mt-4 w-full py-3 rounded-xl font-bold text-sm bg-accent text-brand-green hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">event_repeat</span>
                Reschedule This Booking
              </button>
            </section>
          )}

          {activeTab === 'conference' && memberBayBookingForDay && (
            <div className={`rounded-xl p-3 border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-sm flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                <span className="material-symbols-outlined text-lg">info</span>
                Time slots during your bay booking ({formatTime12(memberBayBookingForDay.start_time)} - {formatTime12(memberBayBookingForDay.end_time)}) are unavailable
              </p>
            </div>
          )}

          {(!existingDayBooking || activeTab !== 'simulator' || rescheduleBookingId) && (
          <>
          <section ref={timeSlotsRef} className="min-h-[120px]">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 pl-1 ${isDark ? 'text-white/80' : 'text-primary/80'}`}>Available Times</h3>
            
            <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0 hidden'}`}>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              </div>
              <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0 hidden' : 'opacity-100'}`}>
              <div className="space-y-2">
                {slotsByHour.map((hourGroup, groupIndex) => {
                  const isExpanded = expandedHour === hourGroup.hour24;
                  const hasSelectedSlot = hourGroup.slots.some(s => selectedSlot?.id === s.id);
                  
                  return (
                    <div 
                      key={hourGroup.hour24}
                      className="animate-pop-in"
                      style={{ animationDelay: `${groupIndex * 0.05}s`, animationFillMode: 'both' }}
                    >
                      <button
                        onClick={() => {
                          haptic.light();
                          setExpandedHour(isExpanded ? null : hourGroup.hour24);
                        }}
                        className={`w-full p-4 rounded-xl border text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                          hasSelectedSlot
                            ? 'bg-accent/20 border-accent/50'
                            : isExpanded
                              ? (isDark ? 'glass-card border-white/20 bg-white/10' : 'bg-white border-black/20')
                              : (isDark ? 'glass-card border-white/10 hover:bg-white/5' : 'bg-white border-black/10 hover:bg-black/5 shadow-sm')
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined text-xl transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${
                            hasSelectedSlot ? (isDark ? 'text-accent' : 'text-accent') : (isDark ? 'text-white/60' : 'text-primary/60')
                          }`}>
                            chevron_right
                          </span>
                          <div>
                            <div className={`font-bold text-base ${hasSelectedSlot ? (isDark ? 'text-accent' : 'text-[#293515]') : (isDark ? 'text-white' : 'text-primary')}`}>
                              {hourGroup.hourLabel}
                            </div>
                            <div className={`text-[10px] font-bold uppercase tracking-wide ${hasSelectedSlot ? 'text-accent/80' : 'opacity-50'}`}>
                              {hourGroup.slots.length} {hourGroup.slots.length === 1 ? 'time' : 'times'} · {hourGroup.totalAvailable} {activeTab === 'simulator' ? 'bays' : 'rooms'}
                            </div>
                          </div>
                        </div>
                        {hasSelectedSlot && (
                          <span className="material-symbols-outlined text-accent">check_circle</span>
                        )}
                      </button>
                      
                      <div className={`grid grid-cols-2 gap-2 overflow-hidden transition-all duration-300 ease-out ${
                        isExpanded ? 'max-h-[500px] opacity-100 mt-2 pl-6' : 'max-h-0 opacity-0'
                      }`}>
                        {hourGroup.slots.map((slot, slotIndex) => (
                          <button
                            key={slot.id}
                            onClick={() => {
                              haptic.light();
                              setSelectedSlot(slot);
                              setSelectedResource(null);
                            }}
                            aria-pressed={selectedSlot?.id === slot.id}
                            className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] focus:ring-2 focus:ring-accent focus:outline-none ${
                              selectedSlot?.id === slot.id
                              ? 'bg-accent text-[#293515] border-accent shadow-glow'
                              : (isDark ? 'glass-card text-white hover:bg-white/10 border-white/10' : 'bg-white text-primary hover:bg-black/5 border-black/10 shadow-sm')
                            }`}
                            style={{ animationDelay: `${slotIndex * 0.03}s` }}
                          >
                            <div className="font-bold text-sm">{slot.start}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wide ${selectedSlot?.id === slot.id ? 'opacity-80' : 'opacity-40'}`}>
                              {slot.availableResourceDbIds.length} {activeTab === 'simulator' ? 'bays' : 'rooms'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {slotsByHour.length === 0 && !isLoading && (
                  <div className={`text-center py-8 text-sm rounded-xl border border-dashed ${isDark ? 'text-white/60 glass-card border-white/20' : 'text-primary/60 bg-white border-black/20'}`}>
                    No slots available for this date.
                  </div>
                )}
              </div>
              </div>
          </section>

          {selectedSlot && (
            <section ref={baySelectionRef} className="animate-pop-in pb-48">
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 pl-1 ${isDark ? 'text-white/80' : 'text-primary/80'}`}>
                Select {activeTab === 'simulator' ? 'Bay' : 'Room'}
              </h3>
              <div className="space-y-3">
                {getAvailableResourcesForSlot(selectedSlot).map((resource, index) => (
                  <div key={resource.id} className="animate-pop-in" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}>
                    <ResourceCard
                      resource={resource}
                      selected={selectedResource?.id === resource.id}
                      onClick={() => { haptic.medium(); setSelectedResource(resource); }}
                      isDark={isDark}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          </>
          )}
        </div>
      )}

      {canBook && (
        <div ref={requestButtonRef} className="fixed bottom-24 left-0 right-0 z-20 px-6 flex justify-center w-full max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={() => { haptic.heavy(); handleConfirm(); }}
            disabled={isBooking}
            className="w-full py-4 rounded-xl font-bold text-lg shadow-glow transition-all flex items-center justify-center gap-2 bg-accent text-[#293515] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 focus:ring-2 focus:ring-white focus:outline-none"
          >
            {isBooking ? (
              <>
                <WalkingGolferSpinner size="sm" />
                <span>Booking...</span>
              </>
            ) : (
              <>
                <span>{rescheduleBookingId ? 'Request Reschedule' : 'Request Booking'}</span>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      )}

      {showConfirmation && (
        <div className="fixed bottom-32 left-0 right-0 z-[60] flex justify-center pointer-events-none">
          <div className={`backdrop-blur-md px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border pointer-events-auto ${isDark ? 'bg-black/80 text-white border-white/10' : 'bg-white/95 text-primary border-black/10'}`}>
            <span className="material-symbols-outlined text-xl text-green-500">schedule_send</span>
            <div>
              <p>{rescheduleBookingId ? 'Reschedule request sent!' : 'Request sent!'}</p>
              <p className="text-[10px] font-normal opacity-80 mt-0.5">Staff will review shortly.</p>
            </div>
          </div>
        </div>
      )}

      {/* View As Confirmation Modal */}
      <ModalShell 
        isOpen={showViewAsConfirm && !!viewAsUser} 
        onClose={() => setShowViewAsConfirm(false)}
        title="Booking on Behalf"
        size="sm"
      >
        {viewAsUser && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                <span className="material-symbols-outlined text-2xl text-amber-500">warning</span>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-primary/60'}`}>View As Mode Active</p>
              </div>
            </div>
            
            <p className={`text-sm mb-6 ${isDark ? 'text-white/80' : 'text-primary/80'}`}>
              You're about to make a booking on behalf of <span className="font-bold">{viewAsUser.name}</span>. 
              This booking will appear in their account.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowViewAsConfirm(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-primary hover:bg-black/10'}`}
              >
                Cancel
              </button>
              <button 
                onClick={submitBooking}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-accent text-brand-green hover:bg-accent/90 transition-colors"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </SwipeablePage>
    </PullToRefresh>
  );
};

const ResourceCard: React.FC<{resource: Resource; selected: boolean; onClick: () => void; isDark?: boolean}> = ({ resource, selected, onClick, isDark = true }) => (
  <button 
    onClick={onClick}
    aria-pressed={selected}
    className={`w-full flex items-center p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] border text-left focus:ring-2 focus:ring-accent focus:outline-none ${
      selected 
      ? 'bg-accent/10 border-accent ring-1 ring-accent' 
      : (isDark ? 'glass-card hover:bg-white/5 border-white/10' : 'bg-white hover:bg-black/5 border-black/10 shadow-sm')
    }`}
  >
    <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center mr-4 overflow-hidden ${selected ? 'bg-accent text-[#293515]' : (isDark ? 'bg-white/5 text-white/40' : 'bg-black/5 text-primary/40')}`}>
      <span className="material-symbols-outlined text-2xl">{resource.icon || 'meeting_room'}</span>
    </div>
    
    <div className="flex-1">
      <div className="flex justify-between items-center mb-0.5">
        <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-primary'}`}>{resource.name}</span>
        {resource.badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${selected ? 'bg-accent text-[#293515]' : (isDark ? 'bg-white/10 text-white/70' : 'bg-black/10 text-primary/70')}`}>
            {resource.badge}
          </span>
        )}
      </div>
      <p className={`text-xs ${isDark ? 'text-white/60' : 'text-primary/60'}`}>{resource.meta}</p>
    </div>
  </button>
);

export default BookGolf;
