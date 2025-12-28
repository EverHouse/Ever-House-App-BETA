import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { getTodayPacific, parseLocalDate } from '../utils/dateUtils';

interface Closure {
  id: number;
  title: string;
  reason: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  affectedAreas: string;
}

const formatAffectedAreas = (areas: string): string => {
  if (areas === 'entire_facility') return 'Entire Facility';
  if (areas === 'all_bays') return 'All Simulator Bays';
  return areas;
};

const formatDateRange = (startDate: string, endDate: string, startTime: string | null, endTime: string | null): string => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const startFormatted = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const endFormatted = end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  
  const timeRange = startTime && endTime 
    ? ` (${startTime.substring(0, 5)} - ${endTime.substring(0, 5)})`
    : startTime 
      ? ` from ${startTime.substring(0, 5)}`
      : '';
  
  if (startDate === endDate) {
    return `${startFormatted}${timeRange}`;
  }
  return `${startFormatted} - ${endFormatted}${timeRange}`;
};

const ClosureAlert: React.FC = () => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const { user } = useData();
  const isDark = effectiveTheme === 'dark';
  
  const [closures, setClosures] = useState<Closure[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const getStorageKey = () => `eh_dismissed_closures_${user?.email || 'guest'}`;

  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDismissedIds(new Set(parsed));
      } catch {
        setDismissedIds(new Set());
      }
    }
  }, [user?.email]);

  useEffect(() => {
    const fetchClosures = async () => {
      try {
        const res = await fetch('/api/closures');
        if (res.ok) {
          const data = await res.json();
          setClosures(data);
        }
      } catch (error) {
        console.error('Failed to fetch closures:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClosures();
  }, []);

  const activeClosures = useMemo(() => {
    const todayStr = getTodayPacific();
    
    return closures.filter(closure => {
      if (dismissedIds.has(closure.id)) return false;
      return closure.endDate >= todayStr;
    });
  }, [closures, dismissedIds]);

  const handleDismiss = (e: React.MouseEvent, closureId: number) => {
    e.stopPropagation();
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(closureId);
    setDismissedIds(newDismissed);
    localStorage.setItem(getStorageKey(), JSON.stringify([...newDismissed]));
  };

  const handleViewDetails = () => {
    navigate('/announcements');
  };

  if (isLoading || activeClosures.length === 0) return null;

  const closure = activeClosures[0];
  const hasMultiple = activeClosures.length > 1;

  return (
    <div 
      className={`mb-6 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
        isDark 
          ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15' 
          : 'bg-red-50 border-red-200 hover:bg-red-100'
      }`}
      onClick={handleViewDetails}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isDark ? 'bg-red-500/20' : 'bg-red-100'
        }`}>
          <span className={`material-symbols-outlined text-xl ${
            isDark ? 'text-red-400' : 'text-red-600'
          }`}>
            event_busy
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {closure.title}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                {formatAffectedAreas(closure.affectedAreas)}
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {formatDateRange(closure.startDate, closure.endDate, closure.startTime, closure.endTime)}
              </p>
            </div>
            <button
              onClick={(e) => handleDismiss(e, closure.id)}
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
            <span className={`text-[10px] uppercase font-bold tracking-wide ${
              isDark ? 'text-red-400' : 'text-red-700'
            }`}>
              {hasMultiple ? `${activeClosures.length} closures scheduled` : 'Facility Closure'}
            </span>
            <span className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              View details
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClosureAlert;
