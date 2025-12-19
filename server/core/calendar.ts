import { pool, isProduction } from './db';
import { getGoogleCalendarClient } from './integrations';

const calendarIdCache: Record<string, string> = {};

export const CALENDAR_CONFIG = {
  golf: {
    name: 'Booked Golf',
    businessHours: { start: 9, end: 21 },
    slotDuration: 60,
  },
  conference: {
    name: 'MBO_Conference_Room',
    businessHours: { start: 8, end: 18 },
    slotDuration: 30,
  },
  events: {
    name: 'Public/Member Events',
  },
  wellness: {
    name: 'Wellness & Classes',
    businessHours: { start: 6, end: 21 },
  }
};

export async function discoverCalendarIds(): Promise<void> {
  try {
    const calendar = await getGoogleCalendarClient();
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];
    
    for (const cal of calendars) {
      if (cal.summary && cal.id) {
        calendarIdCache[cal.summary] = cal.id;
        console.log(`Discovered calendar: "${cal.summary}" -> ${cal.id}`);
      }
    }
  } catch (error) {
    console.error('Error discovering calendars:', error);
  }
}

export async function getCalendarIdByName(name: string): Promise<string | null> {
  if (calendarIdCache[name]) {
    return calendarIdCache[name];
  }
  
  await discoverCalendarIds();
  return calendarIdCache[name] || null;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface BusyPeriod {
  start: Date;
  end: Date;
}

export async function getCalendarBusyTimes(calendarId: string, date: string): Promise<BusyPeriod[]> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        timeZone: 'America/Los_Angeles',
        items: [{ id: calendarId }]
      }
    });
    
    const busyPeriods: BusyPeriod[] = [];
    const calendarBusy = response.data.calendars?.[calendarId]?.busy || [];
    
    for (const period of calendarBusy) {
      if (period.start && period.end) {
        busyPeriods.push({
          start: new Date(period.start),
          end: new Date(period.end)
        });
      }
    }
    
    return busyPeriods;
  } catch (error) {
    console.error('Error fetching busy times:', error);
    return [];
  }
}

export function generateTimeSlots(
  date: string,
  busyPeriods: BusyPeriod[],
  businessHours: { start: number; end: number },
  slotDurationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dateObj = new Date(date);
  
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute = 0; minute < 60; minute += slotDurationMinutes) {
      const slotStart = new Date(dateObj);
      slotStart.setHours(hour, minute, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);
      
      if (slotEnd.getHours() > businessHours.end || 
          (slotEnd.getHours() === businessHours.end && slotEnd.getMinutes() > 0)) {
        continue;
      }
      
      const isAvailable = !busyPeriods.some(busy => {
        return (slotStart < busy.end && slotEnd > busy.start);
      });
      
      const formatTime = (d: Date) => {
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      };
      
      slots.push({
        start: formatTime(slotStart),
        end: formatTime(slotEnd),
        available: isAvailable
      });
    }
  }
  
  return slots;
}

export async function getCalendarAvailability(
  resourceType: 'golf' | 'conference',
  date: string,
  durationMinutes?: number
): Promise<{ slots: TimeSlot[]; calendarId: string | null; error?: string }> {
  const config = CALENDAR_CONFIG[resourceType];
  if (!config) {
    return { slots: [], calendarId: null, error: 'Invalid resource type' };
  }
  
  const calendarId = await getCalendarIdByName(config.name);
  if (!calendarId) {
    return { slots: [], calendarId: null, error: `Calendar "${config.name}" not found` };
  }
  
  const busyPeriods = await getCalendarBusyTimes(calendarId, date);
  const slotDuration = durationMinutes || config.slotDuration;
  const slots = generateTimeSlots(date, busyPeriods, config.businessHours, slotDuration);
  
  return { slots, calendarId };
}

export async function createCalendarEvent(booking: any, bayName: string): Promise<string | null> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const startDateTime = new Date(`${booking.request_date}T${booking.start_time}`);
    const endDateTime = new Date(`${booking.request_date}T${booking.end_time}`);
    
    const event = {
      summary: `Simulator: ${booking.user_name || booking.user_email}`,
      description: `Bay: ${bayName}\nMember: ${booking.user_email}\nDuration: ${booking.duration_minutes} minutes${booking.notes ? '\nNotes: ' + booking.notes : ''}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
    };
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    
    return response.data.id || null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

export async function createCalendarEventOnCalendar(
  calendarId: string,
  summary: string,
  description: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<string | null> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    
    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
    };
    
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
    
    return response.data.id || null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string, calendarId: string = 'primary'): Promise<boolean> {
  try {
    const calendar = await getGoogleCalendarClient();
    await calendar.events.delete({
      calendarId,
      eventId: eventId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

export async function syncGoogleCalendarEvents(): Promise<{ synced: number; created: number; updated: number; error?: string }> {
  try {
    const calendar = await getGoogleCalendarClient();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.events.name);
    
    if (!calendarId) {
      return { synced: 0, created: 0, updated: 0, error: `Calendar "${CALENDAR_CONFIG.events.name}" not found` };
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = response.data.items || [];
    let created = 0;
    let updated = 0;
    
    for (const event of events) {
      if (!event.id || !event.summary) continue;
      
      const googleEventId = event.id;
      const title = event.summary;
      const description = event.description || null;
      
      let eventDate: string;
      let startTime: string;
      let endTime: string | null = null;
      
      if (event.start?.dateTime) {
        const startDt = new Date(event.start.dateTime);
        eventDate = startDt.toISOString().split('T')[0];
        startTime = startDt.toTimeString().substring(0, 8);
        
        if (event.end?.dateTime) {
          const endDt = new Date(event.end.dateTime);
          endTime = endDt.toTimeString().substring(0, 8);
        }
      } else if (event.start?.date) {
        eventDate = event.start.date;
        startTime = '00:00:00';
        endTime = '23:59:00';
      } else {
        continue;
      }
      
      const location = event.location || null;
      
      const existing = await pool.query(
        'SELECT id FROM events WHERE google_calendar_id = $1',
        [googleEventId]
      );
      
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE events SET title = $1, description = $2, event_date = $3, start_time = $4, 
           end_time = $5, location = $6, source = 'google_calendar', visibility = 'public', requires_rsvp = false
           WHERE google_calendar_id = $7`,
          [title, description, eventDate, startTime, endTime, location, googleEventId]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO events (title, description, event_date, start_time, end_time, location, category, 
           source, visibility, requires_rsvp, google_calendar_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [title, description, eventDate, startTime, endTime, location, 'Social', 'google_calendar', 'public', false, googleEventId]
        );
        created++;
      }
    }
    
    return { synced: events.length, created, updated };
  } catch (error) {
    console.error('Error syncing Google Calendar events:', error);
    return { synced: 0, created: 0, updated: 0, error: 'Failed to sync events' };
  }
}

export async function syncWellnessCalendarEvents(): Promise<{ synced: number; created: number; updated: number; error?: string }> {
  try {
    const calendar = await getGoogleCalendarClient();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.wellness.name);
    
    if (!calendarId) {
      return { synced: 0, created: 0, updated: 0, error: `Calendar "${CALENDAR_CONFIG.wellness.name}" not found` };
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = response.data.items || [];
    let created = 0;
    let updated = 0;
    
    for (const event of events) {
      if (!event.id || !event.summary) continue;
      
      const googleEventId = event.id;
      const rawTitle = event.summary;
      const description = event.description || null;
      
      let eventDate: string;
      let startTime: string;
      let endTime: string | null = null;
      let durationMinutes = 60;
      
      if (event.start?.dateTime) {
        const startDt = new Date(event.start.dateTime);
        eventDate = startDt.toISOString().split('T')[0];
        const hours = startDt.getHours();
        const minutes = startDt.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        startTime = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        
        if (event.end?.dateTime) {
          const endDt = new Date(event.end.dateTime);
          durationMinutes = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
        }
      } else if (event.start?.date) {
        eventDate = event.start.date;
        startTime = '09:00 AM';
      } else {
        continue;
      }
      
      let title = rawTitle;
      let instructor = 'TBD';
      let category = 'Wellness';
      
      if (rawTitle.includes(' - ')) {
        const parts = rawTitle.split(' - ');
        category = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
      
      if (rawTitle.toLowerCase().includes(' with ')) {
        const withMatch = rawTitle.match(/with\s+(.+?)(?:\s*[-|]|$)/i);
        if (withMatch) {
          instructor = withMatch[1].trim();
          title = title.replace(/\s+with\s+.+$/i, '').trim();
        }
      }
      
      if (description) {
        const instructorMatch = description.match(/instructor[:\s]+([^\n,]+)/i);
        if (instructorMatch) instructor = instructorMatch[1].trim();
        
        const categoryMatch = description.match(/category[:\s]+([^\n,]+)/i);
        if (categoryMatch) category = categoryMatch[1].trim();
      }
      
      const duration = `${durationMinutes} min`;
      const spots = '10 spots';
      const status = 'Open';
      
      const existing = await pool.query(
        'SELECT id FROM wellness_classes WHERE google_calendar_id = $1',
        [googleEventId]
      );
      
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE wellness_classes SET 
            title = $1, time = $2, instructor = $3, duration = $4, 
            category = $5, spots = $6, status = $7, description = $8, 
            date = $9, is_active = true, updated_at = NOW()
           WHERE google_calendar_id = $10`,
          [title, startTime, instructor, duration, category, spots, status, description, eventDate, googleEventId]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO wellness_classes 
            (title, time, instructor, duration, category, spots, status, description, date, is_active, google_calendar_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW())`,
          [title, startTime, instructor, duration, category, spots, status, description, eventDate, googleEventId]
        );
        created++;
      }
    }
    
    return { synced: events.length, created, updated };
  } catch (error) {
    console.error('Error syncing Wellness Calendar events:', error);
    return { synced: 0, created: 0, updated: 0, error: 'Failed to sync wellness classes' };
  }
}
