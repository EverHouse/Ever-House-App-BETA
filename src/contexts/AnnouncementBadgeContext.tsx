import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useData, Announcement } from './DataContext';

interface AnnouncementBadgeContextType {
  unseenHighPriority: Announcement[];
  hasUnseenAnnouncements: boolean;
  markAsSeen: (announcementIds: string[]) => void;
  markAllAsSeen: () => void;
}

const AnnouncementBadgeContext = createContext<AnnouncementBadgeContextType>({
  unseenHighPriority: [],
  hasUnseenAnnouncements: false,
  markAsSeen: () => {},
  markAllAsSeen: () => {},
});

export const useAnnouncementBadge = () => useContext(AnnouncementBadgeContext);

const getStorageKey = (email: string) => `eh_seen_announcements_${email}`;

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

export const AnnouncementBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, announcements } = useData();
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.email) return;
    const stored = localStorage.getItem(getStorageKey(user.email));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSeenIds(new Set(parsed));
      } catch {
        setSeenIds(new Set());
      }
    }
  }, [user?.email]);

  const unseenHighPriority = useMemo(() => {
    return announcements.filter(a => 
      a.type === 'announcement' && 
      isActiveAnnouncement(a) && 
      !seenIds.has(a.id)
    );
  }, [announcements, seenIds]);

  const hasUnseenAnnouncements = unseenHighPriority.length > 0;

  const markAsSeen = useCallback((announcementIds: string[]) => {
    if (!user?.email) return;
    setSeenIds(prev => {
      const newSet = new Set(prev);
      announcementIds.forEach(id => newSet.add(id));
      localStorage.setItem(getStorageKey(user.email), JSON.stringify([...newSet]));
      return newSet;
    });
  }, [user?.email]);

  const markAllAsSeen = useCallback(() => {
    if (!user?.email) return;
    const allHighPriorityIds = announcements
      .filter(a => a.type === 'announcement' && isActiveAnnouncement(a))
      .map(a => a.id);
    markAsSeen(allHighPriorityIds);
  }, [user?.email, announcements, markAsSeen]);

  return (
    <AnnouncementBadgeContext.Provider value={{ unseenHighPriority, hasUnseenAnnouncements, markAsSeen, markAllAsSeen }}>
      {children}
    </AnnouncementBadgeContext.Provider>
  );
};
