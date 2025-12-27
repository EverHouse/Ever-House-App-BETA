import { Router } from 'express';
import { isProduction } from '../core/db';
import { db } from '../db';
import { tours } from '../../shared/schema';
import { eq, gte, asc, desc, and, sql } from 'drizzle-orm';
import { isStaffOrAdmin } from '../core/middleware';
import { getGoogleCalendarClient } from '../core/integrations';
import { CALENDAR_CONFIG, getCalendarIdByName, discoverCalendarIds } from '../core/calendar';
import { notifyAllStaff } from '../core/staffNotifications';

const router = Router();

router.get('/api/tours', isStaffOrAdmin, async (req, res) => {
  try {
    const { date, upcoming } = req.query;
    
    let query;
    if (date) {
      query = db.select().from(tours)
        .where(eq(tours.tourDate, date as string))
        .orderBy(asc(tours.startTime));
    } else if (upcoming === 'true') {
      query = db.select().from(tours)
        .where(gte(tours.tourDate, sql`CURRENT_DATE`))
        .orderBy(asc(tours.tourDate), asc(tours.startTime));
    } else {
      query = db.select().from(tours)
        .orderBy(desc(tours.tourDate), asc(tours.startTime));
    }
    
    const result = await query;
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Tours fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tours' });
  }
});

router.get('/api/tours/today', isStaffOrAdmin, async (req, res) => {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const result = await db.select().from(tours)
      .where(eq(tours.tourDate, today))
      .orderBy(asc(tours.startTime));
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Today tours fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch today tours' });
  }
});

router.post('/api/tours/:id/checkin', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const staffEmail = (req as any).user?.email || req.body.staffEmail;
    
    const [updated] = await db.update(tours)
      .set({
        status: 'checked_in',
        checkedInAt: new Date(),
        checkedInBy: staffEmail,
        updatedAt: new Date(),
      })
      .where(eq(tours.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    
    res.json(updated);
  } catch (error: any) {
    if (!isProduction) console.error('Tour check-in error:', error);
    res.status(500).json({ error: 'Failed to check in tour' });
  }
});

router.post('/api/tours/sync', isStaffOrAdmin, async (req, res) => {
  try {
    const result = await syncToursFromCalendar();
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Tours sync error:', error);
    res.status(500).json({ error: 'Failed to sync tours' });
  }
});

export async function syncToursFromCalendar(): Promise<{ synced: number; created: number; updated: number; error?: string }> {
  try {
    await discoverCalendarIds();
    const calendar = await getGoogleCalendarClient();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.tours.name);
    
    if (!calendarId) {
      return { synced: 0, created: 0, updated: 0, error: `Calendar "${CALENDAR_CONFIG.tours.name}" not found` };
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
      const description = event.description || '';
      
      let tourDate: string;
      let startTime: string;
      let endTime: string | null = null;
      
      if (event.start?.dateTime) {
        const startDt = new Date(event.start.dateTime);
        tourDate = startDt.toISOString().split('T')[0];
        startTime = startDt.toTimeString().substring(0, 8);
        
        if (event.end?.dateTime) {
          const endDt = new Date(event.end.dateTime);
          endTime = endDt.toTimeString().substring(0, 8);
        }
      } else if (event.start?.date) {
        tourDate = event.start.date;
        startTime = '10:00:00';
        endTime = '11:00:00';
      } else {
        continue;
      }
      
      let guestName = title;
      let guestEmail: string | null = null;
      let guestPhone: string | null = null;
      
      if (description) {
        const emailMatch = description.match(/email[:\s]+([^\s\n,]+@[^\s\n,]+)/i);
        if (emailMatch) guestEmail = emailMatch[1].trim();
        
        const phoneMatch = description.match(/phone[:\s]+([^\n]+)/i) || description.match(/(\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
        if (phoneMatch) guestPhone = phoneMatch[1].trim();
        
        const nameMatch = description.match(/name[:\s]+([^\n]+)/i);
        if (nameMatch) guestName = nameMatch[1].trim();
      }
      
      const existing = await db.select().from(tours).where(eq(tours.googleCalendarId, googleEventId));
      
      if (existing.length > 0) {
        await db.update(tours)
          .set({
            title,
            guestName,
            guestEmail,
            guestPhone,
            tourDate,
            startTime,
            endTime,
            notes: description || null,
            updatedAt: new Date(),
          })
          .where(eq(tours.googleCalendarId, googleEventId));
        updated++;
      } else {
        await db.insert(tours).values({
          googleCalendarId: googleEventId,
          title,
          guestName,
          guestEmail,
          guestPhone,
          tourDate,
          startTime,
          endTime,
          notes: description || null,
          status: 'scheduled',
        });
        created++;
        
        const tourDateObj = new Date(tourDate);
        const formattedDate = tourDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
        await notifyAllStaff(
          'New Tour Scheduled',
          `${guestName} scheduled a tour for ${formattedDate}`,
          'tour_scheduled',
          undefined,
          'tour'
        );
      }
    }
    
    return { synced: events.length, created, updated };
  } catch (error: any) {
    console.error('Error syncing tours from calendar:', error);
    return { synced: 0, created: 0, updated: 0, error: 'Failed to sync tours' };
  }
}

export async function sendTodayTourReminders(): Promise<number> {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const todayTours = await db.select().from(tours)
      .where(and(
        eq(tours.tourDate, today),
        eq(tours.status, 'scheduled')
      ))
      .orderBy(asc(tours.startTime));
    
    if (todayTours.length > 0) {
      const tourList = todayTours.map(t => {
        const time = t.startTime.substring(0, 5);
        return `${time} - ${t.guestName || t.title}`;
      }).join(', ');
      
      await notifyAllStaff(
        `${todayTours.length} Tour${todayTours.length > 1 ? 's' : ''} Today`,
        `Today's tours: ${tourList}`,
        'tour_reminder',
        undefined,
        'tour'
      );
    }
    
    return todayTours.length;
  } catch (error) {
    console.error('Error sending tour reminders:', error);
    return 0;
  }
}

export default router;
