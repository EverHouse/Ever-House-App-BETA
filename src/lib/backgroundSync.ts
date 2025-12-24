const SYNC_INTERVAL = 15 * 60 * 1000;
const THROTTLE_MS = 60 * 1000;

interface SyncCache {
  data: any;
  timestamp: number;
}

const lastFetch: Record<string, number> = {};

const isOnline = () => navigator.onLine;
const isVisible = () => document.visibilityState === 'visible';

export const getCached = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(`sync_${key}`);
    if (!raw) return null;
    const cache: SyncCache = JSON.parse(raw);
    return cache.data as T;
  } catch {
    return null;
  }
};

export const setCache = (key: string, data: any) => {
  const cache: SyncCache = { data, timestamp: Date.now() };
  localStorage.setItem(`sync_${key}`, JSON.stringify(cache));
};

const shouldFetch = (key: string): boolean => {
  const last = lastFetch[key] || 0;
  return Date.now() - last > THROTTLE_MS;
};

export const fetchAndCache = async <T>(
  key: string,
  url: string,
  onUpdate?: (data: T) => void
): Promise<T | null> => {
  if (!shouldFetch(key)) return getCached<T>(key);
  if (!isOnline()) return getCached<T>(key);

  lastFetch[key] = Date.now();

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setCache(key, data);
      onUpdate?.(data);
      return data;
    }
  } catch (e) {
    console.error(`[sync] Failed to fetch ${key}:`, e);
  }
  return getCached<T>(key);
};

const syncAll = async () => {
  if (!isVisible() || !isOnline()) return;

  await Promise.allSettled([
    fetchAndCache('events', '/api/events'),
    fetchAndCache('cafe_menu', '/api/cafe-menu'),
  ]);
};

let intervalId: number | null = null;

export const startBackgroundSync = () => {
  if (intervalId) return;
  
  syncAll();
  intervalId = window.setInterval(syncAll, SYNC_INTERVAL);

  document.addEventListener('visibilitychange', () => {
    if (isVisible()) syncAll();
  });
};

export const stopBackgroundSync = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
