import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import DateButton from '../../components/DateButton';
import SwipeablePage from '../../components/SwipeablePage';
import { triggerHaptic } from '../../utils/haptics';

interface Bay {
  id: number;
  name: string;
  description: string;
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
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  staff_notes: string | null;
  suggested_time: string | null;
  created_at: string;
}

interface AvailabilityData {
  bookings: Array<{ start_time: string; end_time: string; user_name: string }>;
  blocks: Array<{ start_time: string; end_time: string; block_type: string; notes: string }>;
}

const generateDates = (days: number = 14): { label: string; date: string; day: string; dateNum: string }[] => {
  const dates = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      label: `${dayNames[d.getDay()]} ${d.getDate()}`,
      date: d.toISOString().split('T')[0],
      day: dayNames[d.getDay()],
      dateNum: d.getDate().toString()
    });
  }
  return dates;
};

const formatTime12 = (time24: string): string => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes?.toString().padStart(2, '0') || '00'} ${period}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-700';
    case 'approved': return 'bg-green-500/20 text-green-700';
    case 'declined': return 'bg-red-500/20 text-red-700';
    case 'cancelled': return 'bg-gray-500/20 text-gray-500';
    default: return 'bg-gray-500/20 text-gray-500';
  }
};

const Sims: React.FC = () => {
  const { user } = useData();
  const dates = useMemo(() => generateDates(14), []);
  
  const [activeTab, setActiveTab] = useState<'request' | 'my-requests'>('request');
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [duration, setDuration] = useState<30 | 60 | 90>(60);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [bayPreference, setBayPreference] = useState('');
  const [availability, setAvailability] = useState<AvailabilityData>({ bookings: [], blocks: [] });
  const [myRequests, setMyRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
      for (let min = 0; min < 60; min += 30) {
        if (hour === 21 && min > 0) break;
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  const isSlotAvailable = (time: string): boolean => {
    const [hours, mins] = time.split(':').map(Number);
    const slotStart = hours * 60 + mins;
    const slotEnd = slotStart + duration;
    
    for (const booking of availability.bookings) {
      const [bh, bm] = booking.start_time.split(':').map(Number);
      const [eh, em] = booking.end_time.split(':').map(Number);
      const bookStart = bh * 60 + bm;
      const bookEnd = eh * 60 + em;
      
      if (slotStart < bookEnd && slotEnd > bookStart) {
        return false;
      }
    }
    
    for (const block of availability.blocks) {
      if (block.block_type === 'blocked' || block.block_type === 'maintenance' || block.block_type === 'calendar') {
        const [bh, bm] = block.start_time.split(':').map(Number);
        const [eh, em] = block.end_time.split(':').map(Number);
        const blockStart = bh * 60 + bm;
        const blockEnd = eh * 60 + em;
        
        if (slotStart < blockEnd && slotEnd > blockStart) {
          return false;
        }
      }
    }
    
    return true;
  };

  useEffect(() => {
    const fetchBays = async () => {
      try {
        const res = await fetch('/api/bays');
        if (res.ok) {
          const data = await res.json();
          setBays(data);
          if (data.length > 0 && !selectedBay) {
            setSelectedBay(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch bays:', err);
      }
    };
    fetchBays();
  }, []);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedBay) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/bays/${selectedBay}/availability?date=${selectedDate.date}`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAvailability();
  }, [selectedBay, selectedDate.date]);

  useEffect(() => {
    const fetchMyRequests = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch(`/api/booking-requests?user_email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setMyRequests(data);
        }
      } catch (err) {
        console.error('Failed to fetch my requests:', err);
      }
    };
    fetchMyRequests();
  }, [user?.email, showSuccess]);

  const handleSubmitRequest = async () => {
    if (!selectedTime || !user?.email) {
      setError('Please select a time slot');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    triggerHaptic('light');
    
    try {
      const res = await fetch('/api/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user.email,
          user_name: user.name,
          bay_id: selectedBay,
          bay_preference: bayPreference || null,
          request_date: selectedDate.date,
          start_time: selectedTime + ':00',
          duration_minutes: duration,
          notes: notes || null
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit request');
      }
      
      triggerHaptic('success');
      setShowSuccess(true);
      setSelectedTime(null);
      setNotes('');
      setBayPreference('');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: number) => {
    triggerHaptic('light');
    try {
      const res = await fetch(`/api/booking-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (res.ok) {
        setMyRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
        triggerHaptic('success');
      }
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  return (
    <SwipeablePage>
      <div className="min-h-screen bg-bone pb-28">
        <div className="px-4 pt-6">
          <h1 className="text-3xl font-bold text-brand-green mb-2">Simulator Booking</h1>
          <p className="text-sm text-brand-green/70 mb-6">Request a bay and we'll confirm your slot</p>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('request')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'request' 
                  ? 'bg-brand-green text-white shadow-lg' 
                  : 'bg-white/50 text-brand-green border border-brand-green/10'
              }`}
            >
              Request Slot
            </button>
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all relative ${
                activeTab === 'my-requests' 
                  ? 'bg-brand-green text-white shadow-lg' 
                  : 'bg-white/50 text-brand-green border border-brand-green/10'
              }`}
            >
              My Requests
              {myRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center">
                  {myRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {activeTab === 'request' && (
          <div className="px-4">
            {showSuccess && (
              <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <div>
                  <p className="font-medium text-green-700">Request Submitted!</p>
                  <p className="text-sm text-green-600">We'll notify you once it's reviewed.</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600">error</span>
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-green mb-2">Select Date</label>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
                {dates.map(d => (
                  <DateButton
                    key={d.date}
                    day={d.day}
                    date={d.dateNum}
                    active={selectedDate.date === d.date}
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-green mb-2">Select Bay</label>
              <div className="flex gap-2 flex-wrap">
                {bays.map(bay => (
                  <button
                    key={bay.id}
                    onClick={() => {
                      setSelectedBay(bay.id);
                      setSelectedTime(null);
                    }}
                    className={`py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                      selectedBay === bay.id
                        ? 'bg-brand-green text-white shadow-lg'
                        : 'bg-white/50 text-brand-green border border-brand-green/10'
                    }`}
                  >
                    {bay.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-green mb-2">Duration</label>
              <div className="flex gap-2">
                {[30, 60, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      setDuration(d as 30 | 60 | 90);
                      setSelectedTime(null);
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      duration === d
                        ? 'bg-brand-green text-white shadow-lg'
                        : 'bg-white/50 text-brand-green border border-brand-green/10'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-green mb-2">Select Time</label>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-brand-green">progress_activity</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => {
                    const available = isSlotAvailable(time);
                    return (
                      <button
                        key={time}
                        onClick={() => available && setSelectedTime(time)}
                        disabled={!available}
                        className={`py-3 rounded-xl text-sm font-medium transition-all ${
                          selectedTime === time
                            ? 'bg-accent text-brand-green shadow-lg ring-2 ring-brand-green'
                            : available
                              ? 'bg-white/50 text-brand-green border border-brand-green/10 hover:bg-white'
                              : 'bg-gray-200/50 text-gray-400 cursor-not-allowed line-through'
                        }`}
                      >
                        {formatTime12(time)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-green mb-2">Bay Preference (Optional)</label>
              <input
                type="text"
                value={bayPreference}
                onChange={(e) => setBayPreference(e.target.value)}
                placeholder="e.g. Bay near the lounge"
                className="w-full py-3 px-4 rounded-xl bg-white/50 border border-brand-green/10 text-brand-green placeholder-brand-green/40 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-green mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests..."
                rows={3}
                className="w-full py-3 px-4 rounded-xl bg-white/50 border border-brand-green/10 text-brand-green placeholder-brand-green/40 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            
            <button
              onClick={handleSubmitRequest}
              disabled={!selectedTime || isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                selectedTime && !isSubmitting
                  ? 'bg-brand-green text-white shadow-lg active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">send</span>
                  Submit Request
                </>
              )}
            </button>
            
            {selectedTime && (
              <p className="text-center text-sm text-brand-green/60 mt-3">
                {formatDate(selectedDate.date)} at {formatTime12(selectedTime)} for {duration} minutes
              </p>
            )}
          </div>
        )}
        
        {activeTab === 'my-requests' && (
          <div className="px-4">
            {myRequests.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-brand-green/30 mb-4">inbox</span>
                <p className="text-brand-green/60">No booking requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map(request => (
                  <div 
                    key={request.id} 
                    className="bg-white/60 rounded-xl p-4 border border-brand-green/5 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-brand-green">{formatDate(request.request_date)}</p>
                        <p className="text-sm text-brand-green/70">
                          {formatTime12(request.start_time)} - {formatTime12(request.end_time)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    
                    {request.bay_name && (
                      <p className="text-sm text-brand-green/70 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">golf_course</span>
                        {request.bay_name}
                      </p>
                    )}
                    
                    {request.notes && (
                      <p className="text-sm text-brand-green/60 mt-2 italic">"{request.notes}"</p>
                    )}
                    
                    {request.staff_notes && request.status !== 'pending' && (
                      <div className="mt-2 p-2 bg-brand-green/5 rounded-lg">
                        <p className="text-xs text-brand-green/70">Staff note: {request.staff_notes}</p>
                      </div>
                    )}
                    
                    {request.suggested_time && request.status === 'declined' && (
                      <div className="mt-2 p-2 bg-yellow-500/10 rounded-lg">
                        <p className="text-xs text-yellow-700">Suggested time: {formatTime12(request.suggested_time)}</p>
                      </div>
                    )}
                    
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="mt-3 text-sm text-red-500 flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        Cancel Request
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SwipeablePage>
  );
};

export default Sims;
