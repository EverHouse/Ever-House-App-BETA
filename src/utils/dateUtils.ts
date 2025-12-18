export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const cleanDate = dateStr.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLocal(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', options || { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateShort(dateStr: string): string {
  return formatDateLocal(dateStr, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateFull(dateStr: string): string {
  return formatDateLocal(dateStr, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  return getDateString(new Date());
}

export function compareDates(dateStr1: string, dateStr2: string): number {
  const clean1 = dateStr1.split('T')[0];
  const clean2 = dateStr2.split('T')[0];
  return clean1.localeCompare(clean2);
}
