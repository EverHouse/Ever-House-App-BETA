import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData, Announcement } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageReady } from '../../contexts/PageReadyContext';
import SwipeablePage from '../../components/SwipeablePage';
import { MotionList, MotionListItem } from '../../components/motion';

interface UserNotification {
  id: number;
  user_email: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

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

const getNotificationRoute = (notif: UserNotification, isStaffOrAdmin: boolean): string | null => {
  if (notif.type === 'booking_approved' || notif.type === 'booking_declined') {
    return '/book';
  }
  if (notif.type === 'event_reminder') {
    return '/member-events';
  }
  // Tour notifications - navigate staff/admin to tours admin page
  if ((notif.type === 'tour_scheduled' || notif.type === 'tour_reminder') && isStaffOrAdmin) {
    return '/admin?tab=tours';
  }
  return null;
};

const MemberUpdates: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { announcements, isLoading, user, actualUser } = useData();
  const { effectiveTheme } = useTheme();
  const { setPageReady } = usePageReady();
  const isDark = effectiveTheme === 'dark';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const isStaffOrAdmin = actualUser?.role === 'admin' || actualUser?.role === 'staff';
  
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'announcements' | 'activity'>(
    tabParam === 'activity' ? 'activity' : 'announcements'
  );
  
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !notificationsLoading) {
      setPageReady(true);
    }
  }, [isLoading, notificationsLoading, setPageReady]);

  useEffect(() => {
    if (tabParam === 'activity' || tabParam === 'announcements') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'announcements' | 'activity') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (user?.email) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(user.email)}`);
          if (res.ok) {
            const data = await res.json();
            setNotifications(data);
            setUnreadCount(data.filter((n: UserNotification) => !n.is_read).length);
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        } finally {
          setNotificationsLoading(false);
        }
      };
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);

  const handleNotificationClick = async (notif: UserNotification) => {
    if (!notif.is_read) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'PUT' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        // Dispatch event to sync header badge
        window.dispatchEvent(new CustomEvent('notifications-read'));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    
    const route = getNotificationRoute(notif, isStaffOrAdmin);
    if (route) {
      navigate(route);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.email) return;
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: user.email }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      // Dispatch event to sync header badge
      window.dispatchEvent(new CustomEvent('notifications-read'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleAnnouncementClick = (item: Announcement) => {
    if (item.linkType) {
      switch (item.linkType) {
        case 'events':
          navigate('/member-events');
          break;
        case 'wellness':
          navigate('/member-wellness');
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

  const sortedAnnouncements = useMemo(() => {
    return [...activeAnnouncements].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : new Date(a.date).getTime() || 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [activeAnnouncements]);

  const renderAnnouncementsTab = () => (
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
          <p className="text-lg font-medium">No announcements right now</p>
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
                    <span className={`w-2.5 h-2.5 rounded-full ${item.type === 'update' ? 'bg-amber-400' : 'bg-accent'}`} />
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
  );

  const renderActivityTab = () => (
    <div className="relative z-10 pb-32">
      {unreadCount > 0 && (
        <div className="flex justify-end mb-4">
          <button 
            onClick={markAllAsRead}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isDark 
                ? 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10' 
                : 'text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10'
            }`}
          >
            Mark all as read
          </button>
        </div>
      )}
      
      {notificationsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-4 rounded-2xl animate-pulse ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className="flex-1">
                  <div className={`h-4 w-1/2 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  <div className={`h-3 w-3/4 rounded ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className={`text-center py-16 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>
          <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">notifications_off</span>
          <p className="text-lg font-medium">No activity yet</p>
          <p className="text-sm mt-1 opacity-70">Your booking updates and alerts will appear here.</p>
        </div>
      ) : (
        <MotionList className="space-y-3">
          {notifications.map((notif) => (
            <MotionListItem
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`rounded-2xl transition-all cursor-pointer overflow-hidden ${
                notif.is_read 
                  ? isDark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-white hover:bg-gray-50'
                  : isDark ? 'bg-accent/10 hover:bg-accent/15 border border-accent/20' : 'bg-accent/10 hover:bg-accent/15 border border-accent/30'
              } ${isDark ? 'shadow-layered-dark' : 'shadow-layered'}`}
            >
              <div className="flex gap-3 p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  notif.type === 'booking_approved' ? 'bg-green-500/20' :
                  notif.type === 'booking_declined' ? 'bg-red-500/20' :
                  isDark ? 'bg-accent/20' : 'bg-accent/20'
                }`}>
                  <span className={`material-symbols-outlined text-[20px] ${
                    notif.type === 'booking_approved' ? 'text-green-500' :
                    notif.type === 'booking_declined' ? 'text-red-500' :
                    isDark ? 'text-white' : 'text-primary'
                  }`}>
                    {notif.type === 'booking_approved' ? 'check_circle' :
                     notif.type === 'booking_declined' ? 'cancel' :
                     'notifications'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className={`font-bold text-sm ${notif.is_read ? (isDark ? 'text-white/70' : 'text-primary/70') : (isDark ? 'text-white' : 'text-primary')}`}>
                      {notif.title}
                    </h4>
                    <span className={`text-[10px] ml-2 shrink-0 ${isDark ? 'text-white/50' : 'text-primary/50'}`}>
                      {notif.created_at ? new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${notif.is_read ? (isDark ? 'text-white/50' : 'text-primary/50') : (isDark ? 'text-white/70' : 'text-primary/70')}`}>
                    {notif.message}
                  </p>
                </div>
              </div>
            </MotionListItem>
          ))}
        </MotionList>
      )}
    </div>
  );

  return (
    <SwipeablePage className="px-6 pt-2 relative min-h-screen overflow-hidden">
      <section className="mb-4 pt-2">
        <h1 className={`text-3xl font-bold leading-tight drop-shadow-md ${isDark ? 'text-white' : 'text-primary'}`}>Updates</h1>
        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/70' : 'text-primary/70'}`}>Stay in the loop with what's happening.</p>
      </section>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleTabChange('announcements')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${
            activeTab === 'announcements'
              ? 'bg-accent text-primary'
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-primary/5 text-primary/60 hover:bg-primary/10'
          }`}
        >
          Announcements
        </button>
        <button
          onClick={() => handleTabChange('activity')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide transition-all relative ${
            activeTab === 'activity'
              ? 'bg-accent text-primary'
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-primary/5 text-primary/60 hover:bg-primary/10'
          }`}
        >
          Activity
          {unreadCount > 0 && activeTab !== 'activity' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'announcements' ? renderAnnouncementsTab() : renderActivityTab()}
    </SwipeablePage>
  );
};

export default MemberUpdates;
