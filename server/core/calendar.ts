import { pool, isProduction } from './db';
import { getGoogleCalendarClient } from './integrations';
import { db } from '../db';
import { wellnessClasses } from '../../shared/models/auth';
import { isNull, gte, asc, sql, and } from 'drizzle-orm';
import { createPacificDate } from '../utils/dateUtils';

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
    name: 'Events',
  },
  wellness: {
    name: 'Wellness & Classes',
    businessHours: { start: 6, end: 21 },
  },
  tours: {
    name: 'Tours Scheduled',
  },
  internal: {
    name: 'Internal Calendar',
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

export async function getCalendarStatus(): Promise<{
  configured: { key: string; name: string; calendarId: string | null; status: 'connected' | 'not_found' }[];
  discovered: { name: string; calendarId: string }[];
}> {
  await discoverCalendarIds();
  
  const configured = Object.entries(CALENDAR_CONFIG).map(([key, config]) => {
    const calendarId = calendarIdCache[config.name] || null;
    return {
      key,
      name: config.name,
      calendarId,
      status: calendarId ? 'connected' as const : 'not_found' as const
    };
  });
  
  const discovered = Object.entries(calendarIdCache).map(([name, calendarId]) => ({
    name,
    calendarId
  }));
  
  return { configured, discovered };
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
    
    const startOfDay = createPacificDate(date, '00:00:00');
    const endOfDay = createPacificDate(date, '23:59:59');
    
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
    
    // Support both camelCase (from Drizzle ORM) and snake_case property names
    const requestDate = booking.requestDate || booking.request_date;
    const startTime = booking.startTime || booking.start_time;
    const endTime = booking.endTime || booking.end_time;
    const userName = booking.userName || booking.user_name;
    const userEmail = booking.userEmail || booking.user_email;
    const durationMinutes = booking.durationMinutes || booking.duration_minutes;
    
    if (!requestDate || !startTime || !endTime) {
      console.error('Error creating calendar event: Missing required booking fields', { requestDate, startTime, endTime });
      return null;
    }
    
    const startDateTime = createPacificDate(requestDate, startTime);
    const endDateTime = createPacificDate(requestDate, endTime);
    
    const event = {
      summary: `Booking: ${userName || userEmail}`,
      description: `Area: ${bayName}\nMember: ${userEmail}\nDuration: ${durationMinutes} minutes${booking.notes ? '\nNotes: ' + booking.notes : ''}`,
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
    if (!date || !startTime) {
      console.error('Error creating calendar event: Missing date or startTime');
      return null;
    }
    
    const calendar = await getGoogleCalendarClient();
    
    const startDateTime = createPacificDate(date, startTime);
    const endDateTime = createPacificDate(date, endTime || startTime);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      console.error('Error creating calendar event: Invalid date/time values');
      return null;
    }
    
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

export async function updateCalendarEvent(
  eventId: string,
  calendarId: string,
  summary: string,
  description: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  try {
    if (!date || !startTime) {
      console.error('Error updating calendar event: Missing date or startTime');
      return false;
    }
    
    const calendar = await getGoogleCalendarClient();
    
    const startDateTime = createPacificDate(date, startTime);
    const endDateTime = createPacificDate(date, endTime || startTime);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      console.error('Error updating calendar event: Invalid date/time values');
      return false;
    }
    
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: {
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
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

export interface ConferenceRoomBooking {
  id: string;
  summary: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  memberName: string | null;
}

export async function getConferenceRoomBookingsFromCalendar(
  memberName?: string,
  memberEmail?: string
): Promise<ConferenceRoomBooking[]> {
  try {
    const calendar = await getGoogleCalendarClient();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.conference.name);
    
    if (!calendarId) {
      console.error(`Calendar "${CALENDAR_CONFIG.conference.name}" not found`);
      return [];
    }
    
    // Fetch events from today onwards
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
    const bookings: ConferenceRoomBooking[] = [];
    
    for (const event of events) {
      if (!event.id || !event.summary) continue;
      
      // Extract member name from summary
      const summary = event.summary;
      let extractedName: string | null = null;
      
      // Check if summary matches "Booking: Name" pattern (app-created bookings)
      const bookingMatch = summary.match(/^Booking:\s*(.+)$/i);
      if (bookingMatch) {
        extractedName = bookingMatch[1].trim();
      } else if (summary.includes('|')) {
        // Mindbody format: "Conference Room | 60 Minute Booking | Jamie Shon"
        // The member name is typically the last pipe-separated segment
        const segments = summary.split('|').map(s => s.trim());
        // Take the last segment as the member name (it's usually the name)
        extractedName = segments[segments.length - 1] || summary.trim();
      } else {
        // For other events, the whole summary might be the name or booking info
        extractedName = summary.trim();
      }
      
      // Helper to normalize names for comparison (handles "First Last" vs "Last, First")
      const normalizeName = (name: string): string[] => {
        // Remove extra whitespace and convert to lowercase
        const cleaned = name.toLowerCase().replace(/\s+/g, ' ').trim();
        // Split by comma or space to get name parts
        const parts = cleaned.split(/[,\s]+/).filter(p => p.length > 0);
        return parts;
      };
      
      // Filter by member name or email if provided
      if (memberName || memberEmail) {
        let nameMatch = false;
        
        if (memberName && extractedName) {
          // First try simple substring match
          if (extractedName.toLowerCase().includes(memberName.toLowerCase())) {
            nameMatch = true;
          } else {
            // Try matching name parts in any order (handles "First Last" vs "Last, First")
            const searchParts = normalizeName(memberName);
            const eventParts = normalizeName(extractedName);
            // Check if all search parts appear in the event name
            nameMatch = searchParts.every(sp => 
              eventParts.some(ep => ep.includes(sp) || sp.includes(ep))
            );
          }
        }
        
        const emailMatch = memberEmail && 
          (summary.toLowerCase().includes(memberEmail.toLowerCase()) ||
           (event.description && event.description.toLowerCase().includes(memberEmail.toLowerCase())));
        
        if (!nameMatch && !emailMatch) continue;
      }
      
      // Parse date and time
      let eventDate: string;
      let startTime: string;
      let endTime: string;
      
      if (event.start?.dateTime) {
        const startDt = new Date(event.start.dateTime);
        const endDt = event.end?.dateTime ? new Date(event.end.dateTime) : startDt;
        
        eventDate = startDt.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
        startTime = startDt.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Los_Angeles'
        });
        endTime = endDt.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Los_Angeles'
        });
      } else if (event.start?.date) {
        // All-day event
        eventDate = event.start.date;
        startTime = '09:00';
        endTime = '17:00';
      } else {
        continue;
      }
      
      bookings.push({
        id: event.id,
        summary: event.summary,
        description: event.description || null,
        date: eventDate,
        startTime,
        endTime,
        memberName: extractedName
      });
    }
    
    return bookings;
  } catch (error) {
    console.error('Error fetching conference room bookings from calendar:', error);
    return [];
  }
}

export async function syncGoogleCalendarEvents(): Promise<{ synced: number; created: number; updated: number; deleted: number; error?: string }> {
  try {
    const calendar = await getGoogleCalendarClient();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.events.name);
    
    if (!calendarId) {
      return { synced: 0, created: 0, updated: 0, deleted: 0, error: `Calendar "${CALENDAR_CONFIG.events.name}" not found` };
    }
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: oneYearAgo.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = response.data.items || [];
    const fetchedEventIds = new Set<string>();
    let created = 0;
    let updated = 0;
    
    for (const event of events) {
      if (!event.id || !event.summary) continue;
      
      const googleEventId = event.id;
      fetchedEventIds.add(googleEventId);
      const title = event.summary;
      const description = event.description || null;
      
      let eventDate: string;
      let startTime: string;
      let endTime: string | null = null;
      
      if (event.start?.dateTime) {
        const startDt = new Date(event.start.dateTime);
        eventDate = startDt.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
        startTime = startDt.toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour12: false });
        
        if (event.end?.dateTime) {
          const endDt = new Date(event.end.dateTime);
          endTime = endDt.toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour12: false });
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
    
    // Delete events that no longer exist in the Google Calendar
    const existingEvents = await pool.query(
      'SELECT id, google_calendar_id FROM events WHERE google_calendar_id IS NOT NULL'
    );
    
    let deleted = 0;
    for (const dbEvent of existingEvents.rows) {
      if (!fetchedEventIds.has(dbEvent.google_calendar_id)) {
        // This event's source no longer exists in Google Calendar, delete it
        await pool.query('DELETE FROM events WHERE id = $1', [dbEvent.id]);
        deleted++;
      }
    }
    
    return { synced: events.length, created, updated, deleted };
  } catch (error) {
    console.error('Error syncing Google Calendar events:', error);
    return { synced: 0, created: 0, updated: 0, deleted: 0, error: 'Failed to sync events' };
  }
}

export async function syncWellnessCalendarEvents(): Promise<{ synced: number; created: number; updated: number; deleted: number; error?: string }> {
  try {
    const calendar = await getGoogleCalendarClient();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.wellness.name);
    
    if (!calendarId) {
      return { synced: 0, created: 0, updated: 0, deleted: 0, error: `Calendar "${CALENDAR_CONFIG.wellness.name}" not found` };
    }
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: oneYearAgo.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = response.data.items || [];
    const fetchedEventIds = new Set<string>();
    let created = 0;
    let updated = 0;
    
    for (const event of events) {
      if (!event.id || !event.summary) continue;
      
      const googleEventId = event.id;
      fetchedEventIds.add(googleEventId);
      const rawTitle = event.summary;
      const description = event.description || null;
      
      let eventDate: string;
      let startTime: string;
      let endTime: string | null = null;
      let durationMinutes = 60;
      
      if (event.start?.dateTime) {
        const startDt = new Date(event.start.dateTime);
        eventDate = startDt.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
        startTime = startDt.toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false });
        
        if (event.end?.dateTime) {
          const endDt = new Date(event.end.dateTime);
          durationMinutes = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
        }
      } else if (event.start?.date) {
        eventDate = event.start.date;
        startTime = '09:00';
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
    
    // Deactivate wellness classes that no longer exist in the Google Calendar
    const existingClasses = await pool.query(
      'SELECT id, google_calendar_id FROM wellness_classes WHERE google_calendar_id IS NOT NULL AND is_active = true'
    );
    
    let deleted = 0;
    for (const dbClass of existingClasses.rows) {
      if (!fetchedEventIds.has(dbClass.google_calendar_id)) {
        // This wellness class's source no longer exists in Google Calendar, deactivate it
        await pool.query('UPDATE wellness_classes SET is_active = false WHERE id = $1', [dbClass.id]);
        deleted++;
      }
    }
    
    return { synced: events.length, created, updated, deleted };
  } catch (error) {
    console.error('Error syncing Wellness Calendar events:', error);
    return { synced: 0, created: 0, updated: 0, deleted: 0, error: 'Failed to sync wellness classes' };
  }
}

export async function backfillWellnessToCalendar(): Promise<{ created: number; total: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;
  
  try {
    await discoverCalendarIds();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.wellness.name);
    
    if (!calendarId) {
      return { created: 0, total: 0, errors: ['Wellness calendar not found'] };
    }
    
    const classesWithoutCalendarRows = await db.select()
      .from(wellnessClasses)
      .where(and(
        isNull(wellnessClasses.googleCalendarId),
        gte(wellnessClasses.date, sql`CURRENT_DATE`)
      ))
      .orderBy(asc(wellnessClasses.date));
    
    const convertTo24Hour = (timeStr: string): string => {
      const match12h = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match12h) {
        let hours = parseInt(match12h[1]);
        const minutes = match12h[2];
        const period = match12h[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
      }
      const match24h = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (match24h) {
        const hours = match24h[1].padStart(2, '0');
        const minutes = match24h[2];
        const seconds = match24h[3] || '00';
        return `${hours}:${minutes}:${seconds}`;
      }
      return '09:00:00';
    };
    
    const calculateEndTime = (startTime24: string, durationStr: string): string => {
      const durationMatch = durationStr.match(/(\d+)/);
      const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
      const [hours, minutes] = startTime24.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + durationMinutes;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMins = totalMinutes % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
    };
    
    for (const wc of classesWithoutCalendarRows) {
      try {
        const calendarTitle = `${wc.category} - ${wc.title} with ${wc.instructor}`;
        const calendarDescription = [wc.description, `Duration: ${wc.duration}`, `Spots: ${wc.spots}`].filter(Boolean).join('\n');
        const startTime24 = convertTo24Hour(wc.time);
        const endTime24 = calculateEndTime(startTime24, wc.duration);
        
        const googleCalendarId = await createCalendarEventOnCalendar(
          calendarId,
          calendarTitle,
          calendarDescription,
          wc.date,
          startTime24,
          endTime24
        );
        
        if (googleCalendarId) {
          await pool.query('UPDATE wellness_classes SET google_calendar_id = $1 WHERE id = $2', [googleCalendarId, wc.id]);
          created++;
        }
      } catch (err: any) {
        errors.push(`Class ${wc.id}: ${err.message}`);
      }
    }
    
    return { created, total: classesWithoutCalendarRows.length, errors };
  } catch (error: any) {
    console.error('Error backfilling wellness to calendar:', error);
    return { created: 0, total: 0, errors: [`Backfill failed: ${error.message}`] };
  }
}

export async function syncInternalCalendarToClosures(): Promise<{ synced: number; created: number; updated: number; deleted: number; error?: string }> {
  try {
    const calendar = await getGoogleCalendarClient();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.internal.name);
    
    if (!calendarId) {
      return { synced: 0, created: 0, updated: 0, deleted: 0, error: `Calendar "${CALENDAR_CONFIG.internal.name}" not found` };
    }
    
    // Fetch events from now onwards (closures are for future blocking)
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
    const fetchedEventIds = new Set<string>();
    let created = 0;
    let updated = 0;
    
    // Helper function to get all active bay IDs and resources (for facility-wide closures)
    const getAllResourceIds = async (): Promise<number[]> => {
      const idSet = new Set<number>();
      const baysResult = await pool.query('SELECT id FROM bays WHERE is_active = true');
      baysResult.rows.forEach((r: any) => idSet.add(r.id));
      const resourcesResult = await pool.query('SELECT id FROM resources');
      resourcesResult.rows.forEach((r: any) => idSet.add(r.id));
      return Array.from(idSet);
    };
    
    // Helper function to get resource IDs based on affected_areas string
    const getResourceIdsForAffectedAreas = async (affectedAreas: string): Promise<number[]> => {
      const idSet = new Set<number>();
      
      // Normalize for case-insensitive comparison
      const normalized = affectedAreas.toLowerCase().trim();
      
      // entire_facility = all bays + all resources
      if (normalized === 'entire_facility') {
        return getAllResourceIds();
      }
      
      // all_bays = just the simulator bays
      if (normalized === 'all_bays') {
        const baysResult = await pool.query('SELECT id FROM bays WHERE is_active = true');
        baysResult.rows.forEach((r: any) => idSet.add(r.id));
        return Array.from(idSet);
      }
      
      // conference_room = just the conference room (handle various formats)
      if (normalized === 'conference_room' || normalized === 'conference room') {
        const confResult = await pool.query("SELECT id FROM resources WHERE LOWER(name) LIKE '%conference%' LIMIT 1");
        if (confResult.rows.length > 0) {
          idSet.add(confResult.rows[0].id);
        }
        return Array.from(idSet);
      }
      
      // Helper to process a single token and add IDs to the set
      const processToken = async (token: string): Promise<void> => {
        const t = token.toLowerCase().trim();
        if (t === 'entire_facility') {
          const all = await getAllResourceIds();
          all.forEach(id => idSet.add(id));
        } else if (t === 'all_bays') {
          const baysResult = await pool.query('SELECT id FROM bays WHERE is_active = true');
          baysResult.rows.forEach((r: any) => idSet.add(r.id));
        } else if (t === 'conference_room' || t === 'conference room') {
          const confResult = await pool.query("SELECT id FROM resources WHERE LOWER(name) LIKE '%conference%' LIMIT 1");
          if (confResult.rows.length > 0) idSet.add(confResult.rows[0].id);
        } else if (t.startsWith('bay_')) {
          const bayId = parseInt(t.replace('bay_', ''));
          if (!isNaN(bayId)) idSet.add(bayId);
        }
      };
      
      // Single bay (bay_1, bay_2, etc.)
      if (normalized.startsWith('bay_') && !normalized.includes(',') && !normalized.includes('[')) {
        const bayId = parseInt(normalized.replace('bay_', ''));
        if (!isNaN(bayId)) {
          idSet.add(bayId);
        }
        if (idSet.size > 0) return Array.from(idSet);
      }
      
      // Try parsing as JSON array (e.g., ["bay_1", "bay_2", "conference_room", "all_bays"])
      try {
        const parsed = JSON.parse(affectedAreas);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string') {
              await processToken(item);
            }
          }
          if (idSet.size > 0) return Array.from(idSet);
        }
      } catch {
        // Not JSON, try comma-separated
      }
      
      // Comma-separated list (e.g., "bay_1,bay_2,conference_room")
      const parts = affectedAreas.split(',').map(s => s.trim());
      for (const part of parts) {
        await processToken(part);
      }
      
      // FALLBACK: If no resources resolved, default to entire facility to prevent silent no-op closures
      if (idSet.size === 0) {
        console.warn(`[getResourceIdsForAffectedAreas] Could not resolve resources for "${affectedAreas}", falling back to entire_facility`);
        return getAllResourceIds();
      }
      
      return Array.from(idSet);
    };
    
    // Helper function to get dates between start and end (inclusive)
    const getDatesBetween = (start: string, end: string): string[] => {
      const dates: string[] = [];
      let current = new Date(start + 'T12:00:00');
      const endDate = new Date(end + 'T12:00:00');
      while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };
    
    // Helper function to create availability blocks for a closure
    const createAvailabilityBlocks = async (
      closureId: number,
      resourceIds: number[],
      dates: string[],
      blockStartTime: string,
      blockEndTime: string,
      notes: string
    ): Promise<number> => {
      let blocksCreated = 0;
      for (const resourceId of resourceIds) {
        for (const date of dates) {
          await pool.query(
            `INSERT INTO availability_blocks (bay_id, block_date, start_time, end_time, block_type, notes, created_by, closure_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT DO NOTHING`,
            [resourceId, date, blockStartTime, blockEndTime, 'blocked', notes, 'system', closureId]
          );
          blocksCreated++;
        }
      }
      return blocksCreated;
    };
    
    // Helper function to delete availability blocks for a closure
    const deleteAvailabilityBlocks = async (closureId: number): Promise<void> => {
      await pool.query('DELETE FROM availability_blocks WHERE closure_id = $1', [closureId]);
    };
    
    for (const event of events) {
      if (!event.id || !event.summary) continue;
      
      fetchedEventIds.add(event.id);
      const internalCalendarId = event.id;
      const title = event.summary;
      const reason = event.description || 'Internal calendar event';
      
      let startDate: string;
      let startTime: string | null = null;
      let endDate: string;
      let endTime: string | null = null;
      
      if (event.start?.dateTime) {
        // Timed event
        const startDt = new Date(event.start.dateTime);
        startDate = startDt.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
        startTime = startDt.toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour12: false });
        
        if (event.end?.dateTime) {
          const endDt = new Date(event.end.dateTime);
          endDate = endDt.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
          endTime = endDt.toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour12: false });
        } else {
          endDate = startDate;
          endTime = '23:59:00';
        }
      } else if (event.start?.date) {
        // All-day event
        startDate = event.start.date;
        startTime = null;
        // For all-day events, end date is exclusive in Google Calendar, so subtract 1 day
        if (event.end?.date) {
          const endDt = new Date(event.end.date);
          endDt.setDate(endDt.getDate() - 1);
          endDate = endDt.toISOString().split('T')[0];
        } else {
          endDate = startDate;
        }
        endTime = null;
      } else {
        continue;
      }
      
      // Check if this closure already exists
      const existing = await pool.query(
        'SELECT id, start_date, end_date, start_time, end_time, affected_areas FROM facility_closures WHERE internal_calendar_id = $1',
        [internalCalendarId]
      );
      
      if (existing.rows.length > 0) {
        const existingClosure = existing.rows[0];
        const closureId = existingClosure.id;
        
        // PRESERVE manually-set affected_areas - don't overwrite with entire_facility
        const preservedAffectedAreas = existingClosure.affected_areas || 'entire_facility';
        
        // Check if dates/times changed - if so, recreate availability blocks
        const datesChanged = 
          existingClosure.start_date !== startDate || 
          existingClosure.end_date !== endDate ||
          existingClosure.start_time !== startTime ||
          existingClosure.end_time !== endTime;
        
        // Update existing closure - preserve affected_areas, only update title/reason/dates
        await pool.query(
          `UPDATE facility_closures SET 
           title = $1, reason = $2, start_date = $3, start_time = $4,
           end_date = $5, end_time = $6, is_active = true
           WHERE internal_calendar_id = $7`,
          [title, reason, startDate, startTime, endDate, endTime, internalCalendarId]
        );
        
        // If dates/times changed, recreate availability blocks using preserved affected_areas
        if (datesChanged) {
          await deleteAvailabilityBlocks(closureId);
          const resourceIds = await getResourceIdsForAffectedAreas(preservedAffectedAreas);
          const dates = getDatesBetween(startDate, endDate);
          const blockStartTime = startTime || '08:00:00';
          const blockEndTime = endTime || '22:00:00';
          await createAvailabilityBlocks(closureId, resourceIds, dates, blockStartTime, blockEndTime, reason);
          console.log(`[Calendar Sync] Updated availability blocks for closure #${closureId}: ${title}`);
        }
        
        updated++;
      } else {
        // Default to entire_facility for NEW closures from calendar (no manual input yet)
        const affectedAreas = 'entire_facility';
        // Create new closure
        const result = await pool.query(
          `INSERT INTO facility_closures 
           (title, reason, start_date, start_time, end_date, end_time, affected_areas, is_active, created_by, internal_calendar_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'system', $8)
           RETURNING id`,
          [title, reason, startDate, startTime, endDate, endTime, affectedAreas, internalCalendarId]
        );
        
        const closureId = result.rows[0].id;
        
        // Create availability blocks to actually block bookings
        const resourceIds = await getAllResourceIds();
        const dates = getDatesBetween(startDate, endDate);
        const blockStartTime = startTime || '08:00:00';
        const blockEndTime = endTime || '22:00:00';
        const blocksCreated = await createAvailabilityBlocks(closureId, resourceIds, dates, blockStartTime, blockEndTime, reason);
        console.log(`[Calendar Sync] Created ${blocksCreated} availability blocks for closure #${closureId}: ${title}`);
        
        created++;
      }
    }
    
    // Delete closures for events that no longer exist in the calendar
    const existingClosures = await pool.query(
      'SELECT id, internal_calendar_id FROM facility_closures WHERE internal_calendar_id IS NOT NULL'
    );
    
    let deleted = 0;
    for (const closure of existingClosures.rows) {
      if (!fetchedEventIds.has(closure.internal_calendar_id)) {
        // Delete availability blocks first
        await deleteAvailabilityBlocks(closure.id);
        // Then deactivate the closure
        await pool.query('UPDATE facility_closures SET is_active = false WHERE id = $1', [closure.id]);
        console.log(`[Calendar Sync] Deactivated closure #${closure.id} and removed availability blocks`);
        deleted++;
      }
    }
    
    return { synced: events.length, created, updated, deleted };
  } catch (error) {
    console.error('Error syncing Internal Calendar to closures:', error);
    return { synced: 0, created: 0, updated: 0, deleted: 0, error: 'Failed to sync closures' };
  }
}
