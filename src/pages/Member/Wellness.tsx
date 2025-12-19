
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';

interface WellnessClass {
    id: number;
    title: string;
    date: string;
    time: string;
    instructor: string;
    duration: string;
    category: string;
    spots: string;
    status: string;
    description?: string;
}

const Wellness: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addBooking } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const initialTab = searchParams.get('tab') === 'medspa' ? 'medspa' : 'classes';
  const [activeTab, setActiveTab] = useState<'classes' | 'medspa'>(initialTab);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedClass, setSelectedClass] = useState<WellnessClass | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'medspa') setActiveTab('medspa');
    else if (tab === 'classes') setActiveTab('classes');
  }, [searchParams]);

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
    <SwipeablePage className="px-6 pt-2 relative min-h-screen pb-24 overflow-hidden">
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
                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{selectedClass.time} • {selectedClass.date}</p>
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
    { id: 1, title: "Sunrise Flow", date: "Fri, Dec 20", time: "07:00 AM", instructor: "Sarah Jenkins", duration: "60 min", category: "Yoga", spots: "4 spots left", status: "Open", description: "Start your day with intention. A Vinyasa flow class that awakens the body and focuses the mind." },
    { id: 2, title: "Reformer Sculpt", date: "Fri, Dec 20", time: "09:30 AM", instructor: "Marc Davies", duration: "45 min", category: "Pilates", spots: "0 spots left", status: "Full", description: "High-intensity Pilates on the reformer. Expect a full-body burn with a focus on core stability." },
    { id: 3, title: "Evening Reset", date: "Mon, Dec 23", time: "06:00 PM", instructor: "Dr. Chen", duration: "30 min", category: "Meditation", spots: "8 spots left", status: "Open", description: "Guided meditation and breathwork to transition from a busy day into a restful evening." },
    { id: 4, title: "Power Yoga", date: "Sat, Dec 21", time: "05:00 PM", instructor: "Sarah Jenkins", duration: "60 min", category: "Yoga", spots: "2 spots left", status: "Open" }
];

const ClassesView: React.FC<{onSelect: (c: WellnessClass) => void; isDark?: boolean}> = ({ onSelect, isDark = true }) => {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const sortedClasses = [...CLASS_DATA]
    .filter(cls => selectedFilter === 'All' || cls.category === selectedFilter)
    .sort((a, b) => {
      const dateA = new Date(a.date.split(', ')[1] + ', 2024 ' + a.time);
      const dateB = new Date(b.date.split(', ')[1] + ', 2024 ' + b.time);
      return dateA.getTime() - dateB.getTime();
    });

  return (
    <div className="animate-pop-in">
        <section className="mb-6">
        <div className="flex gap-3 overflow-x-auto -mx-6 px-6 scrollbar-hide items-center mb-4">
            <FilterPill label="All" active={selectedFilter === 'All'} onClick={() => setSelectedFilter('All')} isDark={isDark} />
            <FilterPill label="Yoga" active={selectedFilter === 'Yoga'} onClick={() => setSelectedFilter('Yoga')} isDark={isDark} />
            <FilterPill label="Pilates" active={selectedFilter === 'Pilates'} onClick={() => setSelectedFilter('Pilates')} isDark={isDark} />
            <FilterPill label="Meditation" active={selectedFilter === 'Meditation'} onClick={() => setSelectedFilter('Meditation')} isDark={isDark} />
        </div>
        
        <div className="space-y-4">
            {sortedClasses.length > 0 ? (
                sortedClasses.map((cls, index) => (
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

    <div className={`sticky top-0 z-10 py-3 -mx-6 px-6 mb-6 ${isDark ? 'bg-[#0f120a]' : 'bg-[#F2F2EC]'}`}>
       <a 
         href="https://www.amarieaesthetics.co" 
         target="_blank" 
         rel="noopener noreferrer"
         className={`w-full py-3.5 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-white hover:bg-primary/90'}`}
       >
         <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
         Book with Amarie
       </a>
    </div>

    <div className="space-y-6">
      <MedSpaCard title="IV Hydration Drip Menu" subtitle="$125" isDark={isDark}>
        <MenuItem name="The Beauty Drip" desc="Healthy hair, skin, nails, hydration, glowy skin" isDark={isDark} />
        <MenuItem name="Immunity Boost" desc="Immune-supporting vitamins for wellness & recovery" isDark={isDark} />
        <MenuItem name="Hangover Relief" desc="Rehydrate, ease headaches, restore energy" isDark={isDark} />
        <MenuItem name="The Wellness Blend" desc="Myers Cocktail for overall wellness" isDark={isDark} />
        <MenuItem name="Fitness Recovery" desc="Vitamins, minerals, electrolytes for athletes" isDark={isDark} />
        <MenuItem name="Energy Recharge" desc="B12 infusion to boost energy & reduce fatigue" isDark={isDark} />
      </MedSpaCard>
      
      <MedSpaCard title="Wellness Shots" isDark={isDark}>
        <div className="mb-4">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Essentials & Energy</h4>
          <MenuItem name="B12" price="$15" isDark={isDark} />
          <MenuItem name="Glutathione" price="$25" isDark={isDark} />
          <MenuItem name="Folic Acid" price="$20" isDark={isDark} />
          <MenuItem name="Vitamin D3" price="$20" isDark={isDark} />
          <MenuItem name="Zinc" price="$20" isDark={isDark} />
          <MenuItem name="MIC B12" price="$20" isDark={isDark} />
        </div>
        <div className="mb-4">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Amarie x EvenHouse Signature Shots</h4>
          <MenuItem name="The Beauty Trio" price="$30" isDark={isDark} />
          <MenuItem name="Boost Me Up" price="$30" isDark={isDark} />
          <MenuItem name="The Happy Shot" price="$30" isDark={isDark} />
          <MenuItem name="Immuniglow" price="$30" isDark={isDark} />
        </div>
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Peptides</h4>
          <MenuItem name="BPC-157" price="$85" isDark={isDark} />
          <MenuItem name="GHK-Cu" price="$110" isDark={isDark} />
          <MenuItem name="Thymosin Beta-4" price="$115" isDark={isDark} />
        </div>
      </MedSpaCard>

      <MedSpaCard title="NAD+ Treatments" isDark={isDark}>
        <MenuItem name="NAD+ Single Shot" price="$50" isDark={isDark} />
        <MenuItem name="NAD+ Low Dose Package" price="$180" isDark={isDark} />
        <MenuItem name="NAD+ High Dose Package" price="$350" isDark={isDark} />
      </MedSpaCard>

      <MedSpaCard title="Injectables" isDark={isDark}>
        <div className="mb-4">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Neurotoxins</h4>
          <MenuItem name="Botox" price="$10/unit" isDark={isDark} />
          <MenuItem name="Dysport" price="$10/unit" isDark={isDark} />
          <MenuItem name="Lip Flip" price="$50" isDark={isDark} />
          <MenuItem name="Masseters" price="Varies" isDark={isDark} />
        </div>
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Dermal Fillers</h4>
          <p className={`text-xs ${isDark ? 'text-white/60' : 'text-primary/60'}`}>Special pricing for Even House members. Consultation required.</p>
        </div>
      </MedSpaCard>

      <MedSpaCard title="Medical Weightloss" isDark={isDark}>
        <div className="mb-4">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Semaglutide GLP-1</h4>
          <MenuItem name="1 Month" price="$299" isDark={isDark} />
          <MenuItem name="3 Months" price="$799" isDark={isDark} />
        </div>
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>Tirzepatide GLP-1/GIP</h4>
          <MenuItem name="1 Month" price="$399" isDark={isDark} />
          <MenuItem name="3 Months" price="$999" isDark={isDark} />
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

const ClassCard: React.FC<any> = ({ title, date, time, instructor, duration, category, spots, status, onClick, isDark = true }) => (
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
        <span className={`text-sm font-bold ${isDark ? 'text-accent' : 'text-primary'}`}>{date}</span>
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

const MedSpaCard: React.FC<{title: string; subtitle?: string; children: React.ReactNode; isDark?: boolean}> = ({ title, subtitle, children, isDark = true }) => (
  <div className={`rounded-2xl p-5 border ${isDark ? 'glass-card border-white/5' : 'bg-white border-black/10 shadow-sm'}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className={`font-bold text-xl flex items-center gap-2 ${isDark ? 'text-white' : 'text-primary'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
        {title}
      </h3>
      {subtitle && <span className={`text-lg font-bold ${isDark ? 'text-accent' : 'text-primary'}`}>{subtitle}</span>}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const MenuItem: React.FC<{name: string; price?: string; desc?: string; isDark?: boolean}> = ({ name, price, desc, isDark = true }) => (
  <div className="flex justify-between items-start py-1">
    <div className="flex-1 pr-4">
      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-primary/80'}`}>{name}</span>
      {desc && <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>{desc}</p>}
    </div>
    {price && <span className={`text-sm font-bold flex-shrink-0 ${isDark ? 'text-white' : 'text-primary'}`}>{price}</span>}
  </div>
);

export default Wellness;