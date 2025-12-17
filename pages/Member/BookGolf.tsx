import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  label: string;
  available: boolean;
  start_time: string;
  end_time: string;
}

interface DBResource {
  id: number;
  name: string;
  type: string;
  description: string;
  capacity: number;
}

interface Resource {
  id: string;
  name: string;
  meta: string;
  badge?: string;
  icon?: string;
  image?: string;
  dbId?: number;
}

const BookGolf: React.FC = () => {
  const { user } = useData();
  const [activeTab, setActiveTab] = useState<'simulator' | 'lessons' | 'conference'>('simulator');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [duration, setDuration] = useState<number>(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [dbResources, setDbResources] = useState<DBResource[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (selectedResource && selectedDate) {
      fetchAvailability();
    }
  }, [selectedResource, selectedDate, duration]);

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/resources');
      if (res.ok) {
        const data = await res.json();
        setDbResources(data);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedResource) return;
    
    const resource = getResourcesForTab().find(r => r.id === selectedResource);
    if (!resource?.dbId) {
      setAvailableSlots([]);
      return;
    }
    
    setIsCalculating(true);
    try {
      const durationMinutes = duration;
      const res = await fetch(`/api/availability?resource_id=${resource.dbId}&date=${selectedDate}&duration=${durationMinutes}`);
      if (res.ok) {
        const slots = await res.json();
        setAvailableSlots(slots.map((slot: any, idx: number) => ({
          id: `slot-${idx}`,
          start: formatTime(slot.start_time),
          end: formatTime(slot.end_time),
          start_time: slot.start_time,
          end_time: slot.end_time,
          label: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
          available: slot.available
        })));
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:00 ${ampm}`;
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedResource || !user?.email) return;
    
    const resource = getResourcesForTab().find(r => r.id === selectedResource);
    if (!resource?.dbId) return;
    
    setBookingError(null);
    
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resource.dbId,
          user_email: user.email,
          booking_date: selectedDate,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          notes: `${duration} min booking`
        })
      });
      
      if (res.ok) {
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          setSelectedSlot(null);
          fetchAvailability();
        }, 2500);
      } else {
        const error = await res.json();
        setBookingError(error.error || 'Booking failed');
        setTimeout(() => setBookingError(null), 3000);
      }
    } catch (err) {
      setBookingError('Failed to create booking');
      setTimeout(() => setBookingError(null), 3000);
    }
  };

  const getResourcesForTab = (): Resource[] => {
    if (activeTab === 'simulator') {
      const simulators = dbResources.filter(r => r.type === 'simulator');
      return simulators.map(sim => ({
        id: `sim-${sim.id}`,
        dbId: sim.id,
        name: sim.name,
        meta: sim.description || 'TrackMan 4 • Up to 4 players',
        badge: 'Indoor',
        icon: 'golf_course'
      }));
    } else if (activeTab === 'lessons') {
      const instructors = dbResources.filter(r => r.type === 'instructor');
      if (instructors.length > 0) {
        return instructors.map(inst => ({
          id: `inst-${inst.id}`,
          dbId: inst.id,
          name: inst.name,
          meta: inst.description || 'Golf Pro',
          image: 'https://images.unsplash.com/photo-1589579234096-291f034e482c?q=80&w=2787&auto=format&fit=crop'
        }));
      }
      return [];
    } else {
      const rooms = dbResources.filter(r => r.type === 'conference_room');
      return rooms.map(room => ({
        id: `room-${room.id}`,
        dbId: room.id,
        name: room.name,
        meta: room.description || 'Conference Room',
        badge: 'Core+',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop'
      }));
    }
  };

  const isLessonsTabWithNoResources = activeTab === 'lessons' && getResourcesForTab().length === 0;

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        dateStr: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateNum: date.getDate().toString()
      });
    }
    return days;
  };

  const visibleResources = getResourcesForTab();

  // Logic check: Button only shows if Date, Duration (state), Slot, and Resource are present.
  const canBook = selectedDate && duration && selectedSlot && selectedResource;

  return (
    <div className="px-6 pt-4 relative min-h-screen pb-32">
      <section className="mb-6 pt-2">
        <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-md">Book</h1>
        <p className="text-white/70 text-sm font-medium mt-1">Reserve simulators, lessons, or rooms.</p>
      </section>

      <section className="mb-8 border-b border-white/10 -mx-6 px-6">
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide">
          <TabButton label="Golf Simulator" active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} />
          <TabButton label="Private Lessons" active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} />
          <TabButton label="Conference Room" active={activeTab === 'conference'} onClick={() => setActiveTab('conference')} />
        </div>
      </section>

      <div className="relative z-10 animate-pop-in space-y-6">
        
        <section className="glass-card rounded-2xl p-4 border border-white/10 mb-6">
             <span className="text-xs font-bold uppercase text-white/60 tracking-wider mb-3 block">
                Select {activeTab === 'simulator' ? 'Bay' : activeTab === 'lessons' ? 'Instructor' : 'Room'}
             </span>
             <div className="space-y-3">
                {isLessonsTabWithNoResources ? (
                    <div className="text-center py-8 space-y-3">
                        <span className="material-symbols-outlined text-4xl text-white/30">school</span>
                        <div>
                            <p className="text-white/60 text-sm mb-2">Private lessons require personal scheduling</p>
                            <p className="text-white/40 text-xs">Contact the pro shop or call the front desk to book a lesson with one of our PGA instructors.</p>
                        </div>
                        <button className="mt-4 px-6 py-2 bg-accent text-brand-green rounded-lg font-bold text-sm">
                            Contact Pro Shop
                        </button>
                    </div>
                ) : visibleResources.length > 0 ? visibleResources.map((resource) => (
                    <ResourceCard
                        key={resource.id}
                        resource={resource}
                        selected={selectedResource === resource.id}
                        onClick={() => {
                            setSelectedResource(resource.id);
                            setSelectedSlot(null);
                        }}
                        type={activeTab}
                    />
                )) : (
                    <div className="text-center py-6 text-sm text-white/40">
                        No {activeTab === 'simulator' ? 'bays' : activeTab === 'lessons' ? 'instructors' : 'rooms'} available
                    </div>
                )}
             </div>
        </section>

        {selectedResource && (
        <section className="glass-card rounded-2xl p-4 border border-white/10 animate-pop-in">
             <div className="flex items-center justify-between mb-3">
                 <span className="text-xs font-bold uppercase text-white/60 tracking-wider">Date & Duration</span>
             </div>
             <div className="space-y-4">
                 <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {getNextDays().map((d) => {
                        const isActive = selectedDate === d.dateStr;
                        return (
                            <DateButton 
                                key={d.dateStr}
                                day={d.day} 
                                date={d.dateNum} 
                                active={isActive} 
                                onClick={() => {
                                    setSelectedDate(d.dateStr);
                                    setSelectedSlot(null);
                                }}
                            />
                        );
                    })}
                </div>
                <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                    {[30, 60, 90, 120].map(mins => (
                        <button 
                            key={mins}
                            onClick={() => setDuration(mins)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                duration === mins 
                                ? 'bg-white text-brand-green shadow-glow'
                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {mins}m
                        </button>
                    ))}
                </div>
             </div>
        </section>
        )}

        {selectedResource && (
        <section className="min-h-[120px] mt-6 animate-pop-in">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-3 pl-1">Available Times</h3>
            
            {isCalculating ? (
                <div className="flex justify-center items-center py-12 opacity-50 text-white">
                    <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 pb-24">
                    {availableSlots.filter(slot => slot.available).map((slot, index) => (
                        <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] relative overflow-hidden flex flex-col justify-center animate-pop-in ${
                                selectedSlot?.id === slot.id
                                ? 'bg-accent text-brand-green border-accent shadow-glow'
                                : 'glass-card text-white hover:bg-white/10 border-white/10'
                            }`}
                            style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                        >
                           <div className="font-bold text-base mb-0.5">{slot.start}</div>
                           <div className={`text-[10px] font-bold uppercase tracking-wide ${selectedSlot?.id === slot.id ? 'opacity-80' : 'opacity-40'}`}>
                               Available
                           </div>
                        </button>
                    ))}
                    {availableSlots.filter(slot => slot.available).length === 0 && !isCalculating && (
                        <div className="col-span-2 text-center py-8 text-sm opacity-60 glass-card rounded-xl border-dashed text-white">
                            No slots available for this date.
                        </div>
                    )}
                </div>
            )}
        </section>
        )}
      </div>

      {canBook && (
          <div className="fixed bottom-24 left-0 right-0 z-20 px-6 flex justify-center w-full max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
            <button 
                onClick={handleConfirm}
                className="w-full py-4 rounded-xl font-bold text-lg shadow-glow transition-all flex items-center justify-center gap-2 bg-accent text-brand-green hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Confirm Booking</span>
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
          </div>
      )}

       {showConfirmation && (
         <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border border-white/10">
            <span className="material-symbols-outlined text-xl text-green-400">check_circle</span>
            <div>
              <p>Booking confirmed.</p>
              <p className="text-[10px] font-normal opacity-80 mt-0.5">Check email for details.</p>
            </div>
         </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{label: string; active: boolean; onClick: () => void}> = ({ label, active, onClick }) => (
    <button 
    onClick={onClick}
    className={`pb-3 border-b-[3px] ${active ? 'border-accent text-white font-bold' : 'border-transparent text-white/60 font-medium'} text-sm whitespace-nowrap transition-colors`}
  >
    {label}
  </button>
);

const DateButton: React.FC<{day: string; date: string; active?: boolean; onClick?: () => void}> = ({ day, date, active, onClick }) => (
  <button onClick={onClick} className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all active:scale-95 border ${active ? 'bg-white text-brand-green shadow-glow border-white' : 'glass-button text-white border-white/10'}`}>
    <span className={`text-[10px] font-bold uppercase ${active ? 'opacity-100' : 'opacity-60'}`}>{day}</span>
    <span className="text-lg font-bold leading-none mt-0.5">{date}</span>
  </button>
);

const ResourceCard: React.FC<{resource: Resource; selected: boolean; onClick: () => void; type: string}> = ({ resource, selected, onClick, type }) => (
    <div 
        onClick={onClick}
        className={`flex items-center p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] border ${
            selected 
            ? 'bg-accent/10 border-accent ring-1 ring-accent' 
            : 'glass-card hover:bg-white/5 border-white/10'
        }`}
    >
        <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center mr-4 overflow-hidden ${selected ? 'bg-accent text-brand-green' : 'bg-white/5 text-white/40'}`}>
            {resource.image ? (
                <img src={resource.image} alt={resource.name} className="w-full h-full object-cover" />
            ) : (
                <span className="material-symbols-outlined text-2xl">{resource.icon || 'meeting_room'}</span>
            )}
        </div>
        
        <div className="flex-1">
            <div className="flex justify-between items-center mb-0.5">
                <span className={`font-bold text-base ${selected ? 'text-white' : 'text-white'}`}>{resource.name}</span>
                {resource.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${selected ? 'bg-accent text-brand-green' : 'bg-white/10 text-white/70'}`}>
                        {resource.badge}
                    </span>
                )}
            </div>
            <p className="text-xs text-white/60">{resource.meta}</p>
        </div>
    </div>
);

export default BookGolf;