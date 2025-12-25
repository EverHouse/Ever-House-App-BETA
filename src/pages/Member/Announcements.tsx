import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, Announcement } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import TabButton from '../../components/TabButton';
import SwipeablePage from '../../components/SwipeablePage';
import { MotionList, MotionListItem } from '../../components/motion';

const formatDate = (dateStr: string): string => {
  if (!dateStr || dateStr === 'Just now') return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isActiveAnnouncement = (item: Announcement): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (item.startDate) {
    const start = new Date(item.startDate);
    if (start > today) return false;
  }
  
  if (item.endDate) {
    const end = new Date(item.endDate);
    end.setHours(23, 59, 59, 999);
    if (end < today) return false;
  }
  
  return true;
};

const MemberAnnouncements: React.FC = () => {
  const navigate = useNavigate();
  const { announcements, isLoading } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const [filter, setFilter] = useState<'all' | 'update' | 'announcement'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAnnouncementClick = (item: Announcement) => {
    if (item.linkType) {
      switch (item.linkType) {
        case 'events':
          navigate('/events');
          break;
        case 'wellness':
          navigate('/wellness');
          break;
        case 'golf':
          navigate('/book');
          break;
        case 'external':
          if (item.linkTarget) {
            window.open(item.linkTarget, '_blank', 'noopener,noreferrer');
          }
          break;
      }
    }
  };

  const activeAnnouncements = useMemo(() => {
    return announcements.filter(isActiveAnnouncement);
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    if (filter === 'all') return activeAnnouncements;
    return activeAnnouncements.filter(a => a.type === filter);
  }, [activeAnnouncements, filter]);

  const sortedAnnouncements = useMemo(() => {
    return [...filteredAnnouncements].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : new Date(a.date).getTime() || 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [filteredAnnouncements]);

  return (
    <SwipeablePage className="px-6 pt-2 relative min-h-screen overflow-hidden">
      <section className="mb-4 pt-2">
        <h1 className={`text-3xl font-bold leading-tight drop-shadow-md ${isDark ? 'text-white' : 'text-primary'}`}>News & Updates</h1>
        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Stay in the loop with what's happening at the House.</p>
      </section>

      <section className={`mb-8 border-b -mx-6 px-6 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-hide">
          <TabButton 
            label="All" 
            active={filter === 'all'} 
            onClick={() => setFilter('all')} 
            isDark={isDark}
          />
          <TabButton 
            label="Updates" 
            active={filter === 'update'} 
            onClick={() => setFilter('update')} 
            isDark={isDark}
          />
          <TabButton 
            label="Announcements" 
            active={filter === 'announcement'} 
            onClick={() => setFilter('announcement')} 
            isDark={isDark}
          />
        </div>
      </section>

      <div className="relative z-10 pb-32">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`p-5 rounded-2xl animate-pulse ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/20' : 'bg-gray-200'}`} />
                  <div className={`h-3 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                </div>
                <div className={`h-5 w-3/4 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className={`h-4 w-full rounded ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
              </div>
            ))}
          </div>
        ) : sortedAnnouncements.length === 0 ? (
          <div className={`text-center py-16 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>
            <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">campaign</span>
            <p className="text-lg font-medium">No {filter !== 'all' ? filter + 's' : 'updates'} right now</p>
            <p className="text-sm mt-1 opacity-70">Check back soon for the latest news.</p>
          </div>
        ) : (
          <MotionList className="space-y-4">
            {sortedAnnouncements.map((item) => {
              const isExpanded = expandedId === item.id;
              const hasLongDesc = item.desc && item.desc.length > 100;
              const hasLink = !!item.linkType;
              const linkLabel = item.linkType === 'events' ? 'View Events' 
                : item.linkType === 'wellness' ? 'View Wellness' 
                : item.linkType === 'golf' ? 'Book Now' 
                : item.linkType === 'external' ? 'Learn More' : '';
              
              return (
                <MotionListItem 
                  key={item.id}
                  className={`rounded-2xl transition-all overflow-hidden ${isDark ? 'bg-white/[0.03] shadow-layered-dark' : 'bg-white shadow-layered'}`}
                >
                  <div 
                    className={`p-5 ${hasLongDesc || hasLink ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (hasLink) {
                        handleAnnouncementClick(item);
                      } else if (hasLongDesc) {
                        setExpandedId(isExpanded ? null : item.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.type === 'update' ? 'bg-blue-500' : 'bg-accent'}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-primary/50'}`}>
                        {item.type}
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-primary/30'}`}>•</span>
                      <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-primary/40'}`}>
                        {formatDate(item.startDate || item.date)}
                      </span>
                    </div>
                    
                    <h3 className={`text-lg font-bold mb-2 leading-snug ${isDark ? 'text-white' : 'text-primary'}`}>
                      {item.title}
                    </h3>
                    
                    {item.desc && (
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-primary/70'} ${!isExpanded && hasLongDesc ? 'line-clamp-2' : ''}`}>
                        {item.desc}
                      </p>
                    )}
                    
                    {hasLongDesc && !hasLink && (
                      <button className={`mt-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-white/50 hover:text-white/70' : 'text-primary/50 hover:text-primary/70'}`}>
                        <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                        <span className={`material-symbols-outlined text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                    )}
                    
                    {item.endDate && (
                      <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${isDark ? 'bg-white/5 text-white/50' : 'bg-primary/5 text-primary/50'}`}>
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>Until {formatDate(item.endDate)}</span>
                      </div>
                    )}
                    
                    {hasLink && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnnouncementClick(item);
                        }}
                        className={`mt-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                          isDark 
                            ? 'bg-accent/20 text-accent hover:bg-accent/30' 
                            : 'bg-accent/10 text-primary hover:bg-accent/20'
                        }`}
                      >
                        <span>{linkLabel}</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </MotionListItem>
              );
            })}
          </MotionList>
        )}
      </div>
    </SwipeablePage>
  );
};

export default MemberAnnouncements;
