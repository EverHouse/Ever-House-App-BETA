import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../lib/apiRequest';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';
import { MotionList, MotionListItem } from '../../components/motion';
import { EmptyEvents } from '../../components/EmptyState';

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

const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return 'No Date';
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const date = new Date(datePart + 'T12:00:00');
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const Wellness: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useData();
  const { effectiveTheme } = useTheme();
  const { showToast } = useToast();
  const isDark = effectiveTheme === 'dark';
  const initialTab = searchParams.get('tab') === 'medspa' ? 'medspa' : 'classes';
  const [activeTab, setActiveTab] = useState<'classes' | 'medspa'>(initialTab);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('Booking confirmed.');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'medspa') setActiveTab('medspa');
    else if (tab === 'classes') setActiveTab('classes');
  }, [searchParams]);

  const convertTo24Hour = (time12: string): string => {
    const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return '09:00:00';
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const calculateEndTime = (startTime24: string, durationStr: string): string => {
    const durationMatch = durationStr.match(/(\d+)/);
    const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
    const [hours, minutes] = startTime24.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
  };

  const handleBook = async (classData: WellnessClass) => {
    if (!user?.email) return;
    
    const { ok, error } = await apiRequest('/api/wellness-enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classData.id,
        user_email: user.email
      })
    });
    
    if (ok) {
      showToast(`RSVP confirmed for ${classData.title}!`, 'success');
      setConfirmationMessage(`RSVP confirmed for ${classData.title}!`);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2500);
    } else {
      showToast(error || 'Unable to load data. Please try again.', 'error');
      setConfirmationMessage(error || 'Unable to load data. Please try again.');
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2500);
    }
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

      <div className="relative z-10">
        {activeTab === 'classes' && <ClassesView onBook={handleBook} isDark={isDark} />}
        {activeTab === 'medspa' && <MedSpaView isDark={isDark} />}
      </div>

      {showConfirmation && (
         <div className="fixed bottom-32 left-0 right-0 z-[60] flex justify-center pointer-events-none">
             <div className={`backdrop-blur-md px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3 animate-pop-in w-max max-w-[90%] border pointer-events-auto ${isDark ? 'bg-black/80 text-white border-white/10' : 'bg-white/95 text-primary border-black/10'}`}>
                <span className="material-symbols-outlined text-xl text-green-500">check_circle</span>
                <div>
                  <p>{confirmationMessage}</p>
                </div>
             </div>
         </div>
      )}

    </SwipeablePage>
  );
};

const ClassesView: React.FC<{onBook: (cls: WellnessClass) => void; isDark?: boolean}> = ({ onBook, isDark = true }) => {
  const { showToast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [classes, setClasses] = useState<WellnessClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);

  useEffect(() => {
    const fetchClasses = async () => {
      const { ok, data } = await apiRequest<any[]>('/api/wellness-classes?active_only=true');
      
      if (ok && data) {
        const formatted = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          date: c.date,
          time: c.time,
          instructor: c.instructor,
          duration: c.duration,
          category: c.category,
          spots: c.spots,
          status: c.status || 'Open',
          description: c.description
        }));
        setClasses(formatted);
        
        const uniqueCategories = ['All', ...new Set(formatted.map((c: WellnessClass) => c.category))];
        setCategories(uniqueCategories as string[]);
      } else {
        showToast('Unable to load data. Please try again.', 'error');
      }
      
      setIsLoading(false);
    };
    fetchClasses();
  }, [showToast]);

  const sortedClasses = classes
    .filter(cls => selectedFilter === 'All' || cls.category === selectedFilter)
    .sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateA.getTime() - dateB.getTime();
    });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-32 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
        ))}
      </div>
    );
  }

  return (
    <div>
        <section className="mb-6">
        <div className="flex gap-3 overflow-x-auto -mx-6 px-6 scrollbar-hide items-center mb-4">
            {categories.map(cat => (
              <FilterPill 
                key={cat} 
                label={cat} 
                active={selectedFilter === cat} 
                onClick={() => setSelectedFilter(cat)} 
                isDark={isDark} 
              />
            ))}
        </div>
        
        <MotionList className="space-y-4">
            {sortedClasses.length > 0 ? (
                sortedClasses.map((cls) => {
                    const isExpanded = expandedId === cls.id;
                    return (
                    <MotionListItem key={cls.id}>
                        <ClassCard 
                            {...cls}
                            date={formatDateForDisplay(cls.date)}
                            isExpanded={isExpanded}
                            onToggle={() => setExpandedId(isExpanded ? null : cls.id)}
                            onBook={() => onBook(cls)}
                            isDark={isDark}
                        />
                    </MotionListItem>
                    );
                })
            ) : (
                <EmptyEvents message="No classes scheduled yet. Check back soon!" />
            )}
        </MotionList>
        </section>
    </div>
  );
};

const MedSpaView: React.FC<{isDark?: boolean}> = ({ isDark = true }) => (
  <div className="space-y-8">
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
  <button onClick={onClick} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold border transition-colors ${active ? 'bg-[#E7E7DC] text-[#293515] border-[#E7E7DC] shadow-glow' : (isDark ? 'bg-transparent border-white/20 text-white hover:bg-white/5' : 'bg-white border-black/10 text-primary hover:bg-black/5')}`}>
    {label}
  </button>
);

const ClassCard: React.FC<any> = ({ title, date, time, instructor, duration, category, spots, status, description, isExpanded, onToggle, onBook, isDark = true }) => (
  <div 
    className={`rounded-xl relative overflow-hidden transition-all ${isDark ? 'bg-white/[0.03] shadow-layered-dark' : 'bg-white shadow-layered'}`}
  >
    <div 
      onClick={onToggle}
      className={`p-4 cursor-pointer transition-all ${isExpanded ? '' : 'active:scale-[0.98]'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>{category}</span>
            <span className={`text-xs font-bold ${isDark ? 'text-white/60' : 'text-primary/60'}`}>• {duration}</span>
          </div>
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{title}</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-bold ${isDark ? 'text-accent' : 'text-primary'}`}>{date}</span>
          <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{time.split(' ')[0]}</span>
          <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-primary/50'}`}>{time.split(' ')[1]}</span>
        </div>
      </div>
    </div>
    <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
      <div className="px-4 pb-4 pt-0 space-y-3">
        <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-primary/70'}`}>
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span>{instructor}</span>
        </div>
        <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-primary/60'}`}>
          {description || "Join us for a restorative session designed to improve flexibility, strength, and mental clarity."}
        </p>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${status === 'Full' ? 'text-orange-500' : status === 'Confirmed' ? 'text-green-500' : (isDark ? 'text-white/60' : 'text-primary/60')}`}>
          <span className={`w-2 h-2 rounded-full ${status === 'Full' ? 'bg-orange-500' : status === 'Confirmed' ? 'bg-green-500' : 'bg-green-500'}`}></span>
          {status || spots}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onBook(); }}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${status === 'Full' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-primary') : (isDark ? 'bg-white text-brand-green' : 'bg-brand-green text-white')}`}
        >
          {status === 'Full' ? 'Join Waitlist' : status === 'Confirmed' ? 'Booked' : 'RSVP'}
        </button>
      </div>
    </div>
  </div>
);

const MedSpaCard: React.FC<{title: string; subtitle?: string; children: React.ReactNode; isDark?: boolean}> = ({ title, subtitle, children, isDark = true }) => (
  <div className={`rounded-2xl p-5 border ${isDark ? 'glass-card border-white/5' : 'bg-white border-black/10 shadow-sm'}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-primary'}`}>
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