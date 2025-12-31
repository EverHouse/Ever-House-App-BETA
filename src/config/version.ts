export const APP_VERSION = '7.22';
export const LAST_UPDATED = '2025-12-31';

export function formatLastUpdated(): string {
  const [year, month, day] = LAST_UPDATED.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}
