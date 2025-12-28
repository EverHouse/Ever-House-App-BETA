/**
 * Pacific Timezone Utilities for Backend
 * 
 * All club operations use America/Los_Angeles timezone for consistency.
 * Use these utilities for all date/time operations to ensure timezone correctness.
 */

export const CLUB_TIMEZONE = 'America/Los_Angeles';

/**
 * Get today's date in Pacific timezone as YYYY-MM-DD string
 */
export function getTodayPacific(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: CLUB_TIMEZONE });
}

/**
 * Get current hour (0-23) in Pacific timezone
 */
export function getPacificHour(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE,
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * Get Pacific date parts from current time
 */
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

/**
 * Add days to a YYYY-MM-DD date string, returning a new YYYY-MM-DD string
 */
export function addDaysToPacificDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().split('T')[0];
}

/**
 * Parse a YYYY-MM-DD string as a local date (avoids timezone shift issues)
 * The returned Date represents the date at midnight in local time
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date to YYYY-MM-DD in Pacific timezone
 */
export function formatDatePacific(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: CLUB_TIMEZONE });
}

/**
 * Format a date to HH:MM:SS in Pacific timezone (24-hour format)
 */
export function formatTimePacific(date: Date): string {
  return date.toLocaleTimeString('en-GB', { timeZone: CLUB_TIMEZONE, hour12: false });
}

/**
 * Get ISO string for a Pacific date and time
 * This creates a proper ISO timestamp from a date (YYYY-MM-DD) and time (HH:MM or HH:MM:SS)
 * interpreted as Pacific timezone
 */
export function getPacificISOString(dateStr: string, timeStr: string): string {
  // Get current Pacific offset
  const now = new Date();
  const pacificFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE,
    timeZoneName: 'shortOffset'
  });
  const parts = pacificFormatter.formatToParts(now);
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || '-08:00';
  
  // Parse offset like "GMT-8" or "GMT-7" to "-08:00" or "-07:00"
  let offset = '-08:00'; // Default to PST
  const offsetMatch = offsetPart.match(/GMT([+-])(\d+)/);
  if (offsetMatch) {
    const sign = offsetMatch[1];
    const hours = parseInt(offsetMatch[2], 10);
    offset = `${sign}${hours.toString().padStart(2, '0')}:00`;
  }
  
  // Ensure time has seconds
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  
  return `${dateStr}T${normalizedTime}${offset}`;
}

/**
 * Create a Date object from Pacific date and time strings
 * Properly handles the Pacific timezone offset
 */
export function createPacificDate(dateStr: string, timeStr: string): Date {
  return new Date(getPacificISOString(dateStr, timeStr));
}

/**
 * Format a date for display (e.g., "Jan 15")
 */
export function formatDateDisplay(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get tomorrow's date in Pacific timezone as YYYY-MM-DD string
 */
export function getTomorrowPacific(): string {
  return addDaysToPacificDate(getTodayPacific(), 1);
}
