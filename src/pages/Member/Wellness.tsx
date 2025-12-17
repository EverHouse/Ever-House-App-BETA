
import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import DateButton from '../../components/DateButton';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';

interface WellnessClass {
    id: number;
    title: string;
    time: string;
    instructor: string;
    duration: string;
    category: string;
    spots: string;
    status: string;
    description?: string;
}

const Wellness: React.FC = () => {
  const { addBooking } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const [activeTab, setActiveTab] = useState<'classes' | 'medspa'>('classes');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedClass, setSelectedClass] = useState<WellnessClass | null>(null);

  const handleBook = (title?: string) => {
    addBooking({
        id: Date.now().toString(),
        type: 'wellness',
        title: title || 'Wellness Session',
        // Updated to a clearer date format for dashboard display
        date: 'Tue, Oct 24',
        time: 'TBD',
        details: 'Confirmed',
        color: 'accent'
    });

    setSelectedClass(null);
    setShowConfirmation(true);
    setTimeout(() => {
        setShowConfirmation(false);
    }, 2500);
  };

  return (
    <SwipeablePage className={`px-6 pt-2 relative min-h-screen pb-24 overflow-hidden ${isDark ? 'bg-[#0f120a]' : 'bg-[#F2F2EC]'}`}>
      <section className="mb-4 pt-2">
        <h1 className={`text-3xl font-bold leading-tight drop-shadow-md ${isDark ? 'text-white' : 'text-primary'}`}>Wellness</h1>
        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Book your next session.</p>
      </section>

      <section className={`mb-8 border-b -mx-6 px-6 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide">
          <TabButton label="Upcoming Classes" active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} isDark={isDark} />
          <TabButton label="MedSpa" active={activeTab === 'medspa'} onClick={() => setActiveTab('medspa')} isDark={isDark} />
        </div>
      </section>

      <div className="relative z-10 animate-pop-in">
        {activeTab === 'classes' && <ClassesView onSelect={(c) => setSelectedClass(c)} isDark={isDark} />}
        {activeTab === 'medspa' && <MedSpaView onBook={() => handleBook("MedSpa Appointment")} isDark={isDark} />}
      </div>

      {showConfirmation && (
         <div className="fixed bottom-32 left-0 right-0 z-[60] flex justify-center pointer-events-none">
             <div className={`backdrop-blur-md px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border pointer-events-auto ${isDark ? 'bg-black/80 text-white border-white/10' : 'bg-white/95 text-primary border-black/10'}`}>
                <span className="material-symbols-outlined text-xl text-green-500">check_circle</span>
                <div>
                  <p>Booking confirmed.</p>
                </div>
             </div>
         </div>
      )}

      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setSelectedClass(null)}></div>
          
          <div className={`relative w-full max-w-md rounded-t-3xl shadow-2xl animate-slide-up flex flex-col overflow-hidden pb-8 border-t ${isDark ? 'glass-card bg-[#1a210d] border-white/10' : 'bg-white border-black/10'}`}>
             <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>{selectedClass.category}</span>
                            <span className={`text-xs font-bold ${isDark ? 'text-white/60' : 'text-primary/60'}`}>• {selectedClass.duration}</span>
                        </div>
                        <h2 className={`text-2xl font-bold leading-tight ${isDark ? 'text-white' : 'text-primary'}`}>{selectedClass.title}</h2>
                    </div>
                    <button onClick={() => setSelectedClass(null)} className={`p-1 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-primary'}`}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4 mb-8">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
                            <span className="material-symbols-outlined">schedule</span>
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Time</p>
                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{selectedClass.time} • Sept 24</p>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
                            <span className="material-symbols-outlined">person</span>
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Instructor</p>
                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{selectedClass.instructor}</p>
                        </div>
                    </div>

                    <div>
                        <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-primary'}`}>Description</h3>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-primary/70'}`}>
                            {selectedClass.description || "Join us for a restorative session designed to improve flexibility, strength, and mental clarity. Suitable for all levels."}
                        </p>
                    </div>
                </div>

                <button 
                    onClick={() => handleBook(selectedClass.title)}
                    disabled={selectedClass.status === 'Full'}
                    className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 ${selectedClass.status === 'Full' ? (isDark ? 'bg-white/10 text-white/40' : 'bg-black/10 text-primary/40') + ' cursor-not-allowed' : 'bg-brand-green text-white hover:bg-brand-green/90 shadow-glow'}`}
                >
                    {selectedClass.status === 'Full' ? 'Join Waitlist' : 'RSVP'}
                </button>
             </div>
          </div>
        </div>
      )}
    </SwipeablePage>
  );
};

const CLASS_DATA: WellnessClass[] = [
    { id: 1, title: "Sunrise Flow", time: "07:00 AM", instructor: "Sarah Jenkins", duration: "60 min", category: "Yoga", spots: "4 spots left", status: "Open", description: "Start your day with intention. A Vinyasa flow class that awakens the body and focuses the mind." },
    { id: 2, title: "Reformer Sculpt", time: "09:30 AM", instructor: "Marc Davies", duration: "45 min", category: "Pilates", spots: "0 spots left", status: "Full", description: "High-intensity Pilates on the reformer. Expect a full-body burn with a focus on core stability." },
    { id: 3, title: "Evening Reset", time: "06:00 PM", instructor: "Dr. Chen", duration: "30 min", category: "Meditation", spots: "8 spots left", status: "Open", description: "Guided meditation and breathwork to transition from a busy day into a restful evening." },
    { id: 4, title: "Power Yoga", time: "05:00 PM", instructor: "Sarah Jenkins", duration: "60 min", category: "Yoga", spots: "2 spots left", status: "Open" }
];

const ClassesView: React.FC<{onSelect: (c: WellnessClass) => void; isDark?: boolean}> = ({ onSelect, isDark = true }) => {
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filteredClasses = CLASS_DATA.filter(cls => {
      if (selectedFilter === 'All') return true;
      return cls.category === selectedFilter;
  });

  return (
    <div className="animate-pop-in">
        <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-primary/80'}`}>Select Date</h3>
            <button className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-primary'}`}>September 2023</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            <DateButton day="Today" date="24" active={selectedDate === 'Today'} onClick={() => setSelectedDate('Today')} isDark={isDark} />
            <DateButton day="Tue" date="25" active={selectedDate === 'Tue'} onClick={() => setSelectedDate('Tue')} isDark={isDark} />
            <DateButton day="Wed" date="26" active={selectedDate === 'Wed'} onClick={() => setSelectedDate('Wed')} isDark={isDark} />
            <DateButton day="Thu" date="27" active={selectedDate === 'Thu'} onClick={() => setSelectedDate('Thu')} isDark={isDark} />
            <DateButton day="Fri" date="28" active={selectedDate === 'Fri'} onClick={() => setSelectedDate('Fri')} isDark={isDark} />
        </div>
        </section>

        <section className="mb-6">
        <div className="flex gap-3 overflow-x-auto -mx-6 px-6 scrollbar-hide items-center mb-4">
            <FilterPill label="All" active={selectedFilter === 'All'} onClick={() => setSelectedFilter('All')} isDark={isDark} />
            <FilterPill label="Yoga" active={selectedFilter === 'Yoga'} onClick={() => setSelectedFilter('Yoga')} isDark={isDark} />
            <FilterPill label="Pilates" active={selectedFilter === 'Pilates'} onClick={() => setSelectedFilter('Pilates')} isDark={isDark} />
            <FilterPill label="Meditation" active={selectedFilter === 'Meditation'} onClick={() => setSelectedFilter('Meditation')} isDark={isDark} />
        </div>
        
        <div className="space-y-4">
            {filteredClasses.length > 0 ? (
                filteredClasses.map((cls, index) => (
                    <div key={cls.id} className="animate-pop-in" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}>
                        <ClassCard 
                            {...cls}
                            onClick={() => onSelect(cls)}
                            isDark={isDark}
                        />
                    </div>
                ))
            ) : (
                <div className={`text-center py-10 ${isDark ? 'opacity-60' : 'text-primary/60'}`}>
                    <p>No classes available for this filter.</p>
                </div>
            )}
        </div>
        </section>
    </div>
  );
};

const MedSpaView: React.FC<{onBook: () => void; isDark?: boolean}> = ({ onBook, isDark = true }) => (
  <div className="animate-pop-in space-y-8">
    <div className="text-center space-y-2 mb-6">
      <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? 'text-white/60' : 'text-primary/60'}`}>Powered by</p>
      <h2 className={`font-bold text-3xl ${isDark ? 'text-white' : 'text-primary'}`}>Amarie Aesthetics</h2>
      <div className="w-12 h-0.5 bg-accent mx-auto my-4"></div>
      <p className={`text-sm leading-relaxed max-w-[90%] mx-auto ${isDark ? 'text-white/80' : 'text-primary/80'}`}>
        Exclusive medical aesthetics and wellness treatments curated for Even House members.
      </p>
    </div>

    <div className={`sticky top-0 z-10 py-2 backdrop-blur-sm -mx-6 px-6 border-b mb-6 ${isDark ? 'bg-[#293515]/90 border-white/5' : 'bg-[#F2F2EC]/90 border-black/5'}`}>
       <button onClick={onBook} className="w-full py-3.5 rounded-xl bg-brand-green text-white font-bold tracking-wide shadow-glow hover:bg-brand-green/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
         <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
         Book with Amarie
       </button>
    </div>

    <div className="space-y-6">
      <MedSpaCard title="IV Hydration" isDark={isDark}>
        <MenuItem name="The Quench Hydration" price="$149" isDark={isDark} />
        <MenuItem name="Immunity Armor" price="$179" isDark={isDark} />
        <MenuItem name="Performance Recovery" price="$199" isDark={isDark} />
      </MedSpaCard>
      
      <MedSpaCard title="Wellness Shots" isDark={isDark}>
        <div className="mb-3">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Essentials & Energy</h4>
          <MenuItem name="B12 Energy Boost" price="$35" isDark={isDark} />
          <MenuItem name="Vitamin D3 Sunshine" price="$30" isDark={isDark} />
        </div>
      </MedSpaCard>
    </div>
  </div>
);

const FilterPill: React.FC<{label: string; active?: boolean; onClick?: () => void; isDark?: boolean}> = ({ label, active, onClick, isDark = true }) => (
  <button onClick={onClick} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold border transition-colors ${active ? 'bg-accent text-brand-green border-accent shadow-glow' : (isDark ? 'bg-transparent border-white/20 text-white hover:bg-white/5' : 'bg-white border-black/10 text-primary hover:bg-black/5')}`}>
    {label}
  </button>
);

const ClassCard: React.FC<any> = ({ title, time, instructor, duration, category, spots, status, onClick, isDark = true }) => (
  <div 
    onClick={onClick}
    className={`p-4 rounded-xl relative overflow-hidden group cursor-pointer transition-all ${isDark ? 'glass-card hover:bg-white/10' : 'bg-white hover:bg-black/5 border border-black/10 shadow-sm'}`}
  >
    <div className="flex justify-between items-start mb-3">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>{category}</span>
          <span className={`text-xs font-bold ${isDark ? 'text-white/60' : 'text-primary/60'}`}>• {duration}</span>
        </div>
        <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-primary'}`}>{title}</h3>
        <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-primary/70'}`}>
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span>{instructor}</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{time.split(' ')[0]}</span>
        <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-primary/50'}`}>{time.split(' ')[1]}</span>
      </div>
    </div>
    <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
      <div className={`flex items-center gap-1.5 text-xs font-bold ${status === 'Full' ? 'text-orange-500' : status === 'Confirmed' ? 'text-green-500' : (isDark ? 'text-white/60' : 'text-primary/60')}`}>
        <span className={`w-2 h-2 rounded-full ${status === 'Full' ? 'bg-orange-500' : status === 'Confirmed' ? 'bg-green-500' : 'bg-green-500'}`}></span>
        {status || spots}
      </div>
      <button 
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${status === 'Full' ? (isDark ? 'bg-transparent border border-white/20 text-white' : 'bg-transparent border border-black/20 text-primary') : status === 'Confirmed' ? 'bg-green-500/20 text-green-500' : (isDark ? 'bg-transparent border border-white/20 text-white' : 'bg-transparent border border-black/20 text-primary')}`}
      >
        {status === 'Full' ? 'Waitlist' : status === 'Confirmed' ? 'Booked' : 'View'}
      </button>
    </div>
  </div>
);

const MedSpaCard: React.FC<{title: string; children: React.ReactNode; isDark?: boolean}> = ({ title, children, isDark = true }) => (
  <div className={`rounded-2xl p-5 border ${isDark ? 'glass-card border-white/5' : 'bg-white border-black/10 shadow-sm'}`}>
    <h3 className={`font-bold text-xl mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-primary'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
      {title}
    </h3>
    <ul className="space-y-3">{children}</ul>
  </div>
);

const MenuItem: React.FC<{name: string; price: string; isDark?: boolean}> = ({ name, price, isDark = true }) => (
  <li className="flex justify-between items-start">
    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-primary/80'}`}>{name}</span>
    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{price}</span>
  </li>
);

export default Wellness;