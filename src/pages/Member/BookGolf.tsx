import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import DateButton from '../../components/DateButton';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';
import { haptic } from '../../utils/haptics';
import { getTierPermissions, canAccessResource } from '../../utils/permissions';
import { getDateString } from '../../utils/dateUtils';


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

const formatTime12 = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const generateDates = (advanceDays: number = 7): { label: string; date: string; day: string; dateNum: string }[] => {
  const dates = [];
  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < advanceDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
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

const BookGolf: React.FC = () => {
  const { addBooking, user } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const [activeTab, setActiveTab] = useState<'simulator' | 'conference'>('simulator');
  const [duration, setDuration] = useState<number>(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const tierPermissions = getTierPermissions(user?.tier || 'Social');
  const canBookSimulators = canAccessResource(user?.tier || 'Social', 'simulator');
  
  const dates = useMemo(() => generateDates(tierPermissions.advanceBookingDays), [tierPermissions.advanceBookingDays]);
  const [selectedDateObj, setSelectedDateObj] = useState(dates[0]);

  // Sync selectedDateObj when dates array changes (e.g., when user tier loads)
  useEffect(() => {
    if (dates.length > 0 && (!selectedDateObj || !dates.find(d => d.date === selectedDateObj.date))) {
      setSelectedDateObj(dates[0]);
    }
  }, [dates, selectedDateObj]);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch(`/api/resources`);
        if (!res.ok) throw new Error('Failed to fetch resources');
        const data: APIResource[] = await res.json();
        
        const typeMap: Record<string, string> = {
          simulator: 'simulator',
          conference: 'conference_room'
        };
        
        const filtered = data
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
      } catch (err) {
        console.error('Error fetching resources:', err);
        setError('Unable to load resources');
      }
    };
    
    fetchResources();
  }, [activeTab]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!resources || resources.length === 0 || !selectedDateObj?.date) {
        setAvailableSlots([]);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      setSelectedSlot(null);
      setSelectedResource(null);
      
      try {
        const allSlots: Map<string, { slot: TimeSlot; resourceIds: number[] }> = new Map();
        
        await Promise.all(resources.map(async (resource) => {
          const res = await fetch(
            `/api/availability?resource_id=${resource.dbId}&date=${selectedDateObj.date}&duration=${duration}`
          );
          if (!res.ok) return;
          const slots: APISlot[] = await res.json();
          
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
        }));
        
        const sortedSlots = Array.from(allSlots.values())
          .map(({ slot, resourceIds }) => ({
            ...slot,
            availableResourceDbIds: resourceIds
          }))
          .sort((a, b) => a.startTime24.localeCompare(b.startTime24));
        
        setAvailableSlots(sortedSlots);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setError('Unable to load availability');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAvailability();
  }, [resources, selectedDateObj, duration]);

  const getAvailableResourcesForSlot = (slot: TimeSlot): Resource[] => {
    return resources.filter(r => slot.availableResourceDbIds.includes(r.dbId));
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedResource || !user) return;
    
    setIsBooking(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: selectedResource.dbId,
          user_email: user.email,
          booking_date: selectedDateObj.date,
          start_time: selectedSlot.startTime24,
          end_time: selectedSlot.endTime24,
          notes: `${duration} min booking`
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Booking failed');
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
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        setSelectedSlot(null);
        setSelectedResource(null);
        setAvailableSlots(prev => prev.filter(s => s.id !== selectedSlot.id));
      }, 2500);
    } catch (err: any) {
      haptic.error();
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const canBook = Boolean(selectedDateObj && duration && selectedSlot && selectedResource && !isBooking);

  return (
    <SwipeablePage className="px-6 pt-4 relative min-h-screen pb-32">
      <section className="mb-6 pt-2">
        <h1 className={`text-3xl font-bold leading-tight drop-shadow-md ${isDark ? 'text-white' : 'text-primary'}`}>Book</h1>
        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Reserve simulators or conference room.</p>
      </section>

      <section className={`mb-8 border-b -mx-6 px-6 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide" role="tablist">
          <TabButton label="Golf Simulator" active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} isDark={isDark} />
          <TabButton label="Conference Room" active={activeTab === 'conference'} onClick={() => setActiveTab('conference')} isDark={isDark} />
        </div>
      </section>

      {activeTab === 'simulator' && !canBookSimulators ? (
        <section className={`rounded-2xl p-6 border text-center ${isDark ? 'glass-card border-white/10' : 'bg-white border-black/10 shadow-sm'}`}>
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
      ) : (
        <div className="relative z-10 animate-pop-in space-y-6">
          <section className={`rounded-2xl p-4 border ${isDark ? 'glass-card border-white/10' : 'bg-white border-black/10 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-primary/60'}`}>Date & Duration</span>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {dates.map((d) => (
                  <DateButton 
                    key={d.date}
                    day={d.day} 
                    date={d.dateNum} 
                    active={selectedDateObj.date === d.date} 
                    onClick={() => setSelectedDateObj(d)} 
                    isDark={isDark}
                  />
                ))}
              </div>
              <div className={`flex gap-2 p-1 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-black/5'}`}>
                {[30, 60, 90, 120].map(mins => (
                  <button 
                    key={mins}
                    onClick={() => { haptic.selection(); setDuration(mins); }}
                    aria-pressed={duration === mins}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95 focus:ring-2 focus:ring-accent focus:outline-none ${
                      duration === mins 
                      ? 'bg-accent text-brand-green shadow-glow'
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

          <section className="min-h-[120px]">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 pl-1 ${isDark ? 'text-white/80' : 'text-primary/80'}`}>Available Times</h3>
            
            {isLoading ? (
              <div className={`flex justify-center items-center py-12 opacity-50 ${isDark ? 'text-white' : 'text-primary'}`}>
                <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableSlots.map((slot, index) => (
                  <button
                    key={slot.id}
                    onClick={() => {
                      haptic.light();
                      setSelectedSlot(slot);
                      setSelectedResource(null);
                    }}
                    aria-pressed={selectedSlot?.id === slot.id}
                    className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] relative overflow-hidden flex flex-col justify-center animate-pop-in focus:ring-2 focus:ring-accent focus:outline-none ${
                      selectedSlot?.id === slot.id
                      ? 'bg-accent text-brand-green border-accent shadow-glow'
                      : (isDark ? 'glass-card text-white hover:bg-white/10 border-white/10' : 'bg-white text-primary hover:bg-black/5 border-black/10 shadow-sm')
                    }`}
                    style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                  >
                    <div className="font-bold text-base mb-0.5">{slot.start}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${selectedSlot?.id === slot.id ? 'opacity-80' : 'opacity-40'}`}>
                      {slot.availableResourceDbIds.length} Available
                    </div>
                  </button>
                ))}
                {availableSlots.length === 0 && !isLoading && (
                  <div className={`col-span-2 text-center py-8 text-sm rounded-xl border border-dashed ${isDark ? 'text-white/60 glass-card border-white/20' : 'text-primary/60 bg-white border-black/20'}`}>
                    No slots available for this date.
                  </div>
                )}
              </div>
            )}
          </section>

          {selectedSlot && (
            <section className="animate-pop-in pb-24">
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
        </div>
      )}

      {canBook && (
        <div className="fixed bottom-24 left-0 right-0 z-20 px-6 flex justify-center w-full max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={() => { haptic.heavy(); handleConfirm(); }}
            disabled={isBooking}
            className="w-full py-4 rounded-xl font-bold text-lg shadow-glow transition-all flex items-center justify-center gap-2 bg-accent text-brand-green hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 focus:ring-2 focus:ring-white focus:outline-none"
          >
            {isBooking ? (
              <>
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                <span>Booking...</span>
              </>
            ) : (
              <>
                <span>Confirm Booking</span>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      )}

      {showConfirmation && (
        <div className="fixed bottom-32 left-0 right-0 z-[60] flex justify-center pointer-events-none">
          <div className={`backdrop-blur-md px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border pointer-events-auto ${isDark ? 'bg-black/80 text-white border-white/10' : 'bg-white/95 text-primary border-black/10'}`}>
            <span className="material-symbols-outlined text-xl text-green-500">check_circle</span>
            <div>
              <p>Booking confirmed!</p>
              <p className="text-[10px] font-normal opacity-80 mt-0.5">Added to your dashboard.</p>
            </div>
          </div>
        </div>
      )}
    </SwipeablePage>
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
    <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center mr-4 overflow-hidden ${selected ? 'bg-accent text-brand-green' : (isDark ? 'bg-white/5 text-white/40' : 'bg-black/5 text-primary/40')}`}>
      <span className="material-symbols-outlined text-2xl">{resource.icon || 'meeting_room'}</span>
    </div>
    
    <div className="flex-1">
      <div className="flex justify-between items-center mb-0.5">
        <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-primary'}`}>{resource.name}</span>
        {resource.badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${selected ? 'bg-accent text-brand-green' : (isDark ? 'bg-white/10 text-white/70' : 'bg-black/10 text-primary/70')}`}>
            {resource.badge}
          </span>
        )}
      </div>
      <p className={`text-xs ${isDark ? 'text-white/60' : 'text-primary/60'}`}>{resource.meta}</p>
    </div>
  </button>
);

export default BookGolf;
