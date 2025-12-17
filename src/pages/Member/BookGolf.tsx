import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import DateButton from '../../components/DateButton';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';

const API_BASE = 'http://localhost:3001';

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

const generateDates = (): { label: string; date: string; day: string; dateNum: string }[] => {
  const dates = [];
  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = days[d.getDay()];
    const dateNum = d.getDate().toString();
    const isoDate = d.toISOString().split('T')[0];
    dates.push({
      label: `${dayName} ${dateNum}`,
      date: isoDate,
      day: dayName,
      dateNum: dateNum
    });
  }
  return dates;
};

const BookGolf: React.FC = () => {
  const { addBooking, user } = useData();
  const [activeTab, setActiveTab] = useState<'simulator' | 'lessons' | 'conference'>('simulator');
  const [duration, setDuration] = useState<number>(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const dates = useMemo(() => generateDates(), []);
  const [selectedDateObj, setSelectedDateObj] = useState(dates[0]);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/resources`);
        if (!res.ok) throw new Error('Failed to fetch resources');
        const data: APIResource[] = await res.json();
        
        const typeMap: Record<string, string> = {
          simulator: 'simulator',
          lessons: 'instructor',
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
      if (resources.length === 0) return;
      
      setIsLoading(true);
      setError(null);
      setSelectedSlot(null);
      setSelectedResource(null);
      
      try {
        const allSlots: Map<string, { slot: TimeSlot; resourceIds: number[] }> = new Map();
        
        await Promise.all(resources.map(async (resource) => {
          const res = await fetch(
            `${API_BASE}/api/availability?resource_id=${resource.dbId}&date=${selectedDateObj.date}&duration=${duration}`
          );
          if (!res.ok) return;
          const slots: APISlot[] = await res.json();
          
          slots.forEach(slot => {
            if (!slot.available) return;
            
            const key = slot.start_time;
            const timeSlot: TimeSlot = {
              id: `slot-${slot.start_time}`,
              start: formatTime12(slot.start_time),
              end: formatTime12(slot.end_time),
              startTime24: slot.start_time,
              endTime24: slot.end_time,
              label: `${formatTime12(slot.start_time)} – ${formatTime12(slot.end_time)}`,
              available: true
            };
            
            if (allSlots.has(key)) {
              allSlots.get(key)!.resourceIds.push(resource.dbId);
            } else {
              allSlots.set(key, { slot: timeSlot, resourceIds: [resource.dbId] });
            }
          });
        }));
        
        const sortedSlots = Array.from(allSlots.values())
          .map(({ slot }) => slot)
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
    return resources;
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedResource || !user) return;
    
    setIsBooking(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
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
      
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        setSelectedSlot(null);
        setSelectedResource(null);
        setAvailableSlots(prev => prev.filter(s => s.id !== selectedSlot.id));
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const canBook = Boolean(selectedDateObj && duration && selectedSlot && selectedResource && !isBooking);

  return (
    <SwipeablePage className="px-6 pt-4 relative min-h-screen pb-32">
      <section className="mb-6 pt-2">
        <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-md">Book</h1>
        <p className="text-white/70 text-sm font-medium mt-1">Reserve simulators, lessons, or rooms.</p>
      </section>

      <section className="mb-8 border-b border-white/10 -mx-6 px-6">
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide" role="tablist">
          <TabButton label="Golf Simulator" active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} />
          <TabButton label="Private Lessons" active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} />
          <TabButton label="Conference Room" active={activeTab === 'conference'} onClick={() => setActiveTab('conference')} />
        </div>
      </section>

      {activeTab === 'lessons' ? (
        <section className="glass-card rounded-2xl p-6 border border-white/10 text-center">
          <span className="material-symbols-outlined text-4xl text-accent mb-4">school</span>
          <h3 className="text-lg font-bold text-white mb-2">Private Lessons</h3>
          <p className="text-white/60 text-sm mb-4">
            Contact the club directly to schedule a private lesson with one of our PGA/LPGA instructors.
          </p>
          <a 
            href="tel:9495455855" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-brand-green rounded-xl font-bold text-sm"
          >
            <span className="material-symbols-outlined text-lg">call</span>
            Call to Book
          </a>
        </section>
      ) : (
        <div className="relative z-10 animate-pop-in space-y-6">
          <section className="glass-card rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-white/60 tracking-wider">Date & Duration</span>
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
                  />
                ))}
              </div>
              <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                {[30, 60, 90, 120].map(mins => (
                  <button 
                    key={mins}
                    onClick={() => setDuration(mins)}
                    aria-pressed={duration === mins}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95 focus:ring-2 focus:ring-accent focus:outline-none ${
                      duration === mins 
                      ? 'bg-accent text-brand-green shadow-glow'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-3 pl-1">Available Times</h3>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12 opacity-50 text-white">
                <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableSlots.map((slot, index) => (
                  <button
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setSelectedResource(null);
                    }}
                    aria-pressed={selectedSlot?.id === slot.id}
                    className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] relative overflow-hidden flex flex-col justify-center animate-pop-in focus:ring-2 focus:ring-accent focus:outline-none ${
                      selectedSlot?.id === slot.id
                      ? 'bg-accent text-brand-green border-accent shadow-glow'
                      : 'glass-card text-white hover:bg-white/10 border-white/10'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                  >
                    <div className="font-bold text-base mb-0.5">{slot.start}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${selectedSlot?.id === slot.id ? 'opacity-80' : 'opacity-40'}`}>
                      {resources.length} Available
                    </div>
                  </button>
                ))}
                {availableSlots.length === 0 && !isLoading && (
                  <div className="col-span-2 text-center py-8 text-sm text-white/60 glass-card rounded-xl border border-dashed border-white/20">
                    No slots available for this date.
                  </div>
                )}
              </div>
            )}
          </section>

          {selectedSlot && (
            <section className="animate-pop-in pb-24">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-3 pl-1">
                Select {activeTab === 'simulator' ? 'Bay' : 'Room'}
              </h3>
              <div className="space-y-3">
                {resources.map((resource, index) => (
                  <div key={resource.id} className="animate-pop-in" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}>
                    <ResourceCard
                      resource={resource}
                      selected={selectedResource?.id === resource.id}
                      onClick={() => setSelectedResource(resource)}
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
            onClick={handleConfirm}
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
          <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border border-white/10 pointer-events-auto">
            <span className="material-symbols-outlined text-xl text-green-400">check_circle</span>
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

const ResourceCard: React.FC<{resource: Resource; selected: boolean; onClick: () => void}> = ({ resource, selected, onClick }) => (
  <button 
    onClick={onClick}
    aria-pressed={selected}
    className={`w-full flex items-center p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] border text-left focus:ring-2 focus:ring-accent focus:outline-none ${
      selected 
      ? 'bg-accent/10 border-accent ring-1 ring-accent' 
      : 'glass-card hover:bg-white/5 border-white/10'
    }`}
  >
    <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center mr-4 overflow-hidden ${selected ? 'bg-accent text-brand-green' : 'bg-white/5 text-white/40'}`}>
      <span className="material-symbols-outlined text-2xl">{resource.icon || 'meeting_room'}</span>
    </div>
    
    <div className="flex-1">
      <div className="flex justify-between items-center mb-0.5">
        <span className="font-bold text-base text-white">{resource.name}</span>
        {resource.badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${selected ? 'bg-accent text-brand-green' : 'bg-white/10 text-white/70'}`}>
            {resource.badge}
          </span>
        )}
      </div>
      <p className="text-xs text-white/60">{resource.meta}</p>
    </div>
  </button>
);

export default BookGolf;
