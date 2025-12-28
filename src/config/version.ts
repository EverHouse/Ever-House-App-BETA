export const APP_VERSION = '3.8';
export const LAST_UPDATED = '2025-12-28';

export function formatLastUpdated(): string {
  const date = new Date(LAST_UPDATED + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
