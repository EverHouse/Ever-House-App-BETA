export const CLUB_TIMEZONE = 'America/Los_Angeles';

export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const cleanDate = dateStr.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get day of week (0-6) for a YYYY-MM-DD date using Zeller's algorithm (timezone-agnostic)
 */
function getDayOfWeek(year: number, month: number, day: number): number {
  let m = month;
  let y = year;
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  const k = y % 100;
  const j = Math.floor(y / 100);
  const h = (day + Math.floor(13 * (m + 1) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7;
  return ((h + 6) % 7);
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDateLocal(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const cleanDate = dateStr.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);
  const dayOfWeek = getDayOfWeek(year, month, day);
  
  const useShortWeekday = !options?.weekday || options.weekday === 'short';
  const useShortMonth = !options?.month || options.month === 'short';
  
  const weekdayStr = useShortWeekday ? SHORT_DAYS[dayOfWeek] : LONG_DAYS[dayOfWeek];
  const monthStr = useShortMonth ? SHORT_MONTHS[month - 1] : LONG_MONTHS[month - 1];
  
  return `${weekdayStr}, ${monthStr} ${day}`;
}

export function formatDateShort(dateStr: string): string {
  return formatDateLocal(dateStr, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateFull(dateStr: string): string {
  return formatDateLocal(dateStr, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatDateDisplay(dateStr: string): string {
  const cleanDate = dateStr.split('T')[0];
  const [, month, day] = cleanDate.split('-').map(Number);
  return `${SHORT_MONTHS[month - 1]} ${day}`;
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayPacific(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: CLUB_TIMEZONE });
}

export function getTodayString(): string {
  return getTodayPacific();
}

export function getPacificHour(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE,
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(new Date()), 10);
}

export function getPacificDateParts(): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute')
  };
}

export function addDaysToPacificDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().split('T')[0];
}

export function compareDates(dateStr1: string, dateStr2: string): number {
  const clean1 = dateStr1.split('T')[0];
  const clean2 = dateStr2.split('T')[0];
  return clean1.localeCompare(clean2);
}

export function formatDateDisplayWithDay(dateStr: string): string {
  const cleanDate = dateStr.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);
  const dayOfWeek = getDayOfWeek(year, month, day);
  return `${SHORT_DAYS[dayOfWeek]}, ${SHORT_MONTHS[month - 1]} ${day}`;
}

export function formatTime12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.substring(0, 5).split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatDateTimePacific(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    timeZone: CLUB_TIMEZONE 
  });
}
