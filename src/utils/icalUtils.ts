export interface ICalEventData {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

function formatICalDate(dateStr: string, timeStr?: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${mins}00`;
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICalEvent(event: ICalEventData): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@evenhouse.club`;
  const now = new Date();
  const dtstamp = formatICalDate(now.toISOString().split('T')[0], now.toTimeString().substring(0, 5));
  
  let dtstart = formatICalDate(event.startDate, event.startTime);
  let dtend: string;
  
  if (event.endTime) {
    dtend = formatICalDate(event.startDate, event.endTime);
  } else if (event.durationMinutes && event.startTime) {
    const [hours, minutes] = event.startTime.split(':').map(Number);
    const endDate = new Date(event.startDate + 'T00:00:00');
    endDate.setHours(hours, minutes + event.durationMinutes, 0, 0);
    const endHours = String(endDate.getHours()).padStart(2, '0');
    const endMins = String(endDate.getMinutes()).padStart(2, '0');
    dtend = formatICalDate(event.startDate, `${endHours}:${endMins}`);
  } else {
    const endDate = new Date(event.startDate + 'T00:00:00');
    endDate.setHours(endDate.getHours() + 2);
    const endHours = String(endDate.getHours()).padStart(2, '0');
    const endMins = String(endDate.getMinutes()).padStart(2, '0');
    dtend = formatICalDate(event.startDate, `${endHours}:${endMins}`);
  }
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Even House//Members App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];
  
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }
  
  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }
  
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

export function downloadICalFile(event: ICalEventData, filename?: string): void {
  const icalContent = generateICalEvent(event);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
