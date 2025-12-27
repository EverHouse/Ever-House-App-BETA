import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAnnouncementBadge } from '../contexts/AnnouncementBadgeContext';
import { Announcement } from '../contexts/DataContext';

const AnnouncementAlert: React.FC = () => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const { unseenHighPriority, markAllAsSeen } = useAnnouncementBadge();

  if (unseenHighPriority.length === 0) return null;

  const latestAnnouncement = unseenHighPriority[0];
  const hasMultiple = unseenHighPriority.length > 1;
  const isUpdate = latestAnnouncement.type === 'update';

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsSeen();
  };

  const handleAnnouncementClick = (item: Announcement) => {
    markAllAsSeen();
    if (item.linkType) {
      switch (item.linkType) {
        case 'events':
          navigate('/member-events');
          return;
        case 'wellness':
          navigate('/member-wellness');
          return;
        case 'golf':
          navigate('/book');
          return;
        case 'external':
          if (item.linkTarget) {
            window.open(item.linkTarget, '_blank', 'noopener,noreferrer');
          }
          return;
      }
    }
    navigate('/announcements');
  };

  const handleViewAll = () => {
    handleAnnouncementClick(latestAnnouncement);
  };

  const cardColors = isUpdate
    ? isDark 
      ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15' 
      : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
    : isDark
      ? 'bg-accent/10 border-accent/30 hover:bg-accent/15'
      : 'bg-accent/10 border-accent/30 hover:bg-accent/20';

  const iconBgColor = isUpdate
    ? isDark ? 'bg-amber-500/20' : 'bg-amber-100'
    : isDark ? 'bg-accent/20' : 'bg-accent/20';

  const iconColor = isUpdate
    ? isDark ? 'text-amber-400' : 'text-amber-600'
    : isDark ? 'text-accent' : 'text-accent';

  const labelColor = isUpdate
    ? isDark ? 'text-amber-400' : 'text-amber-700'
    : isDark ? 'text-accent' : 'text-primary';

  const labelText = hasMultiple 
    ? `${unseenHighPriority.length} new ${isUpdate ? 'updates' : 'announcements'}` 
    : `New ${isUpdate ? 'update' : 'announcement'}`;

  return (
    <div 
      className={`mb-6 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${cardColors}`}
      onClick={handleViewAll}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}>
          <span className={`material-symbols-outlined text-xl ${iconColor}`}>
            campaign
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {latestAnnouncement.title}
              </h3>
              {latestAnnouncement.desc && (
                <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  {latestAnnouncement.desc}
                </p>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className={`p-1 rounded-full shrink-0 transition-colors ${
                isDark 
                  ? 'text-white/50 hover:text-white hover:bg-white/10' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
              }`}
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] uppercase font-bold tracking-wide ${labelColor}`}>
              {labelText}
            </span>
            <span className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {latestAnnouncement.linkType === 'events' ? 'View Events' :
               latestAnnouncement.linkType === 'wellness' ? 'View Wellness' :
               latestAnnouncement.linkType === 'golf' ? 'Book Now' :
               latestAnnouncement.linkType === 'external' ? 'Learn More' : 'Tap to view'}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementAlert;
