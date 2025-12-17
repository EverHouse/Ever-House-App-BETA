
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import DateButton from '../../components/DateButton';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  label: string;
  availableResourceIds: string[];
}

interface Resource {
  id: string;
  name: string;
  meta: string;
  badge?: string;
  icon?: string;
  image?: string;
}

const BookGolf: React.FC = () => {
  const { addBooking } = useData();
  const [activeTab, setActiveTab] = useState<'simulator' | 'lessons' | 'conference'>('simulator');
  const [selectedDate, setSelectedDate] = useState('Tue 24');
  const [duration, setDuration] = useState<number>(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setSelectedSlot(null);
    setSelectedResource(null);
    setAvailableSlots([]);
    setIsCalculating(true);
    const timer = setTimeout(() => {
      setAvailableSlots(generateMockSlots(activeTab, duration));
      setIsCalculating(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeTab, selectedDate, duration]);

  const handleConfirm = () => {
    if (selectedSlot && selectedResource) {
        const resources = getResourcesForTab();
        const r = resources.find(r => r.id === selectedResource);
        addBooking({
            id: Date.now().toString(),
            type: 'golf',
            title: r ? r.name : 'Booking',
            // Pass full date string
            date: selectedDate,
            time: selectedSlot.start,
            details: `${duration} min`,
            color: 'primary'
        });
    }
    setShowConfirmation(true);
    setTimeout(() => {
        setShowConfirmation(false);
        setSelectedSlot(null);
        setSelectedResource(null);
    }, 2500);
  };

  const getResourcesForTab = (): Resource[] => {
    if (activeTab === 'simulator') {
      return [
        { id: 'bay1', name: 'Bay 1', meta: 'TrackMan 4 • Up to 4 players', badge: 'Indoor', icon: 'golf_course' },
        { id: 'bay2', name: 'Bay 2', meta: 'TrackMan 4 • Up to 4 players', badge: 'Indoor', icon: 'golf_course' },
        { id: 'bay3', name: 'Bay 3', meta: 'TrackMan 4 • Up to 4 players', badge: 'Indoor', icon: 'golf_course' },
        { id: 'bay4', name: 'Bay 4', meta: 'TrackMan 4 • Pro Series', badge: 'Private', icon: 'golf_course' },
      ];
    } else if (activeTab === 'lessons') {
      return [
        { id: 'inst1', name: 'Rebecca Lee', meta: 'LPGA Pro • $150/hr', image: 'https://images.unsplash.com/photo-1589579234096-291f034e482c?q=80&w=2787&auto=format&fit=crop' },
        { id: 'inst2', name: 'Tim Silverman', meta: 'PGA Coach • $130/hr', image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=2787&auto=format&fit=crop' },
      ];
    } else {
      return [
        { id: 'room1', name: 'The Boardroom', meta: 'Seats 8 • TV & Video Conf', badge: 'Core+', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop' }
      ];
    }
  };

  const visibleResources = selectedSlot 
    ? getResourcesForTab().filter(r => selectedSlot.availableResourceIds.includes(r.id))
    : [];

  // Strict validation logic
  const canBook = Boolean(selectedDate && duration && selectedSlot && selectedResource);

  return (
    <SwipeablePage className="px-6 pt-4 relative min-h-screen pb-32">
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
        
        <section className="glass-card rounded-2xl p-4 border border-white/10">
             <div className="flex items-center justify-between mb-3">
                 <span className="text-xs font-bold uppercase text-white/60 tracking-wider">Date & Duration</span>
             </div>
             <div className="space-y-4">
                 <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {['Mon 23', 'Tue 24', 'Wed 25', 'Thu 26', 'Fri 27'].map((d) => {
                        const day = d.split(' ')[0];
                        const dateNum = d.split(' ')[1];
                        const isActive = selectedDate === d;
                        return (
                            <DateButton 
                                key={d}
                                day={day} 
                                date={dateNum} 
                                active={isActive} 
                                onClick={() => setSelectedDate(d)} 
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

        <section className="min-h-[120px]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-3 pl-1">Available Times</h3>
            
            {isCalculating ? (
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
                            className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] relative overflow-hidden flex flex-col justify-center animate-pop-in ${
                                selectedSlot?.id === slot.id
                                ? 'bg-accent text-brand-green border-accent shadow-glow'
                                : 'glass-card text-white hover:bg-white/10 border-white/10'
                            }`}
                            style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                        >
                           <div className="font-bold text-base mb-0.5">{slot.start}</div>
                           <div className={`text-[10px] font-bold uppercase tracking-wide ${selectedSlot?.id === slot.id ? 'opacity-80' : 'opacity-40'}`}>
                               {slot.availableResourceIds.length} Available
                           </div>
                        </button>
                    ))}
                    {availableSlots.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-sm opacity-60 glass-card rounded-xl border-dashed">
                            No slots available.
                        </div>
                    )}
                </div>
            )}
        </section>

        {selectedSlot && (
            <section className="animate-pop-in pb-24">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-3 pl-1">
                    Select {activeTab === 'simulator' ? 'Bay' : activeTab === 'lessons' ? 'Instructor' : 'Room'}
                </h3>
                <div className="space-y-3">
                    {visibleResources.map((resource, index) => (
                        <div key={resource.id} className="animate-pop-in" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}>
                             <ResourceCard
                                resource={resource}
                                selected={selectedResource === resource.id}
                                onClick={() => setSelectedResource(resource.id)}
                                type={activeTab}
                            />
                        </div>
                    ))}
                </div>
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
         <div className="fixed bottom-32 left-0 right-0 z-[60] flex justify-center pointer-events-none">
             <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border border-white/10 pointer-events-auto">
                <span className="material-symbols-outlined text-xl text-green-400">check_circle</span>
                <div>
                  <p>Booking confirmed.</p>
                  <p className="text-[10px] font-normal opacity-80 mt-0.5">Check email for details.</p>
                </div>
             </div>
         </div>
      )}
    </SwipeablePage>
  );
};

const generateMockSlots = (tab: string, duration: number): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 20;
    for (let h = startHour; h < endHour; h++) {
        if (Math.random() > 0.7) continue;
        const start = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
        const totalMinutes = h * 60 + duration;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        const end = `${endH > 12 ? endH - 12 : endH}:${endM === 0 ? '00' : endM} ${endH >= 12 ? 'PM' : 'AM'}`;
        let availableResourceIds: string[] = [];
        if (tab === 'simulator') {
             availableResourceIds = ['bay1', 'bay2', 'bay3', 'bay4'].filter(() => Math.random() > 0.3);
        } else if (tab === 'lessons') {
             availableResourceIds = ['inst1', 'inst2'].filter(() => Math.random() > 0.4);
        } else {
             if (Math.random() > 0.2) availableResourceIds = ['room1'];
        }
        if (availableResourceIds.length > 0) {
            slots.push({ id: `slot-${h}`, start, end, label: `${start} – ${end}`, availableResourceIds });
        }
    }
    return slots;
};

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