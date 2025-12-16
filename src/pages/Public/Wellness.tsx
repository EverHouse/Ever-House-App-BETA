import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';

const PublicWellness: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'classes' | 'medspa'>('classes');

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-3xl font-bold leading-tight text-primary dark:text-white">Wellness at Even House</h1>
        <p className="text-primary/70 dark:text-gray-400 text-base font-medium mt-1">Restoration for body and mind.</p>
      </div>

      <section className="mb-8 border-b border-black/5 dark:border-white/5 px-6">
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('classes')}
            className={`pb-3 border-b-[3px] ${activeTab === 'classes' ? 'border-primary dark:border-white text-primary dark:text-white font-bold' : 'border-transparent text-primary/60 dark:text-white/60 font-medium'} text-sm whitespace-nowrap transition-colors`}
          >
            Classes
          </button>
          <button 
            onClick={() => setActiveTab('medspa')}
            className={`pb-3 border-b-[3px] ${activeTab === 'medspa' ? 'border-primary dark:border-white text-primary dark:text-white font-bold' : 'border-transparent text-primary/60 dark:text-white/60 font-medium'} text-sm whitespace-nowrap transition-colors`}
          >
            MedSpa
          </button>
        </div>
      </section>

      <div className="flex-1 px-6">
        {activeTab === 'classes' ? <ClassesView onLogin={() => navigate('/login')} /> : <MedSpaView />}
      </div>

      <Footer />
    </div>
  );
};

const ClassesView: React.FC<{onLogin: () => void}> = ({ onLogin }) => (
  <div className="animate-fade-in pb-12">
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider opacity-60">Schedule Preview</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        <DatePill day="Today" date="24" active />
        <DatePill day="Tue" date="25" />
        <DatePill day="Wed" date="26" />
        <DatePill day="Thu" date="27" />
        <DatePill day="Fri" date="28" />
      </div>
    </section>

    <section className="space-y-4">
      <ClassCard 
        title="Sunrise Flow" 
        time="07:00 AM" 
        instructor="Sarah Jenkins" 
        duration="60 min" 
        category="Yoga" 
      />
      <ClassCard 
        title="Reformer Sculpt" 
        time="09:30 AM" 
        instructor="Marc Davies" 
        duration="45 min" 
        category="Pilates" 
      />
      <ClassCard 
        title="Evening Reset" 
        time="06:00 PM" 
        instructor="Dr. Chen" 
        duration="30 min" 
        category="Meditation" 
      />
    </section>

    <div className="mt-8 p-6 bg-surface-light dark:bg-surface-dark rounded-xl border border-primary/10 text-center">
        <p className="text-primary/70 dark:text-white/70 mb-4 font-medium">Log in to book classes and view full schedule.</p>
        <button onClick={onLogin} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors">Member Login</button>
    </div>
  </div>
);

const MedSpaView: React.FC = () => (
  <div className="animate-fade-in space-y-8 pb-12">
    <div className="text-center space-y-2 mb-6">
      <p className="text-xs uppercase tracking-[0.2em] text-primary/60 dark:text-white/60">Powered by</p>
      <h2 className="text-3xl text-primary dark:text-white italic font-bold">Amarie Aesthetics</h2>
      <div className="w-12 h-0.5 bg-accent mx-auto my-4"></div>
      <p className="text-sm text-primary/80 dark:text-white/80 leading-relaxed max-w-[90%] mx-auto">
        Exclusive medical aesthetics and wellness treatments curated for Even House members.
      </p>
    </div>

    <div className="space-y-6">
      <MedSpaCard title="IV Hydration">
        <MenuItem name="The Quench Hydration" price="$149" />
        <MenuItem name="Immunity Armor" price="$179" />
        <MenuItem name="Performance Recovery" price="$199" />
      </MedSpaCard>
      
      <MedSpaCard title="Wellness Shots">
        <div className="mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary/50 dark:text-white/50 mb-2">Essentials & Energy</h4>
          <MenuItem name="B12 Energy Boost" price="$35" />
          <MenuItem name="Vitamin D3 Sunshine" price="$30" />
        </div>
      </MedSpaCard>
    </div>
  </div>
);

const DatePill: React.FC<{day: string; date: string; active?: boolean}> = ({ day, date, active }) => (
  <button className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 w-[68px] rounded-2xl transition-transform ${active ? 'bg-primary text-white shadow-lg' : 'bg-surface-light dark:bg-surface-dark border border-black/5 dark:border-white/10 text-primary dark:text-white'}`}>
    <span className="text-xs font-bold uppercase tracking-wider opacity-80">{day}</span>
    <span className="text-2xl font-bold">{date}</span>
  </button>
);

const ClassCard: React.FC<any> = ({ title, time, instructor, duration, category }) => (
  <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm border border-black/5 dark:border-white/10 relative overflow-hidden">
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary dark:bg-white/10 dark:text-white">{category}</span>
          <span className="text-xs font-bold text-primary/60 dark:text-white/60">• {duration}</span>
        </div>
        <h3 className="text-xl font-bold text-primary dark:text-white mb-1">{title}</h3>
        <div className="flex items-center gap-1.5 text-sm text-primary/70 dark:text-gray-400">
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span>{instructor}</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-lg font-bold text-primary dark:text-white">{time.split(' ')[0]}</span>
        <span className="text-xs font-medium text-primary/50 dark:text-white/50">{time.split(' ')[1]}</span>
      </div>
    </div>
    <div className="pt-4 border-t border-black/5 dark:border-white/5 text-center">
       <span className="text-xs font-bold text-primary/50 dark:text-white/50 uppercase tracking-widest">Members Only</span>
    </div>
  </div>
);

const MedSpaCard: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-black/5 dark:border-white/5">
    <h3 className="text-xl font-bold text-primary dark:text-white mb-4 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
      {title}
    </h3>
    <ul className="space-y-3">{children}</ul>
  </div>
);

const MenuItem: React.FC<{name: string; price: string}> = ({ name, price }) => (
  <li className="flex justify-between items-start">
    <span className="text-sm font-medium text-primary/80 dark:text-gray-300">{name}</span>
    <span className="text-sm font-bold text-primary dark:text-white">{price}</span>
  </li>
);

export default PublicWellness;