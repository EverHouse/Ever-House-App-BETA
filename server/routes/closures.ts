import { Router } from 'express';
import { isProduction } from '../core/db';
import { db } from '../db';
import { facilityClosures, pushSubscriptions, users, bays, availabilityBlocks } from '../../shared/schema';
import { eq, desc, or, isNull, inArray } from 'drizzle-orm';
import webpush from 'web-push';
import { isStaffOrAdmin } from '../core/middleware';
import { getCalendarIdByName, deleteCalendarEvent, CALENDAR_CONFIG } from '../core/calendar';
import { getGoogleCalendarClient } from '../core/integrations';

const router = Router();

export async function sendPushNotificationToAllMembers(payload: { title: string; body: string; url?: string }) {
  try {
    const subscriptions = await db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userEmail, users.email))
      .where(or(eq(users.role, 'member'), isNull(users.role)));
    
    const notifications = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      
      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        }
      }
    });
    
    await Promise.all(notifications);
    console.log(`[Push] Sent notification to ${subscriptions.length} members`);
  } catch (error) {
    console.error('Failed to send push notification to members:', error);
  }
}

async function getAffectedBayIds(affectedAreas: string): Promise<number[]> {
  if (affectedAreas === 'entire_facility' || affectedAreas === 'all_bays') {
    const activeBays = await db
      .select({ id: bays.id })
      .from(bays)
      .where(eq(bays.isActive, true));
    return activeBays.map(bay => bay.id);
  }
  
  if (affectedAreas.startsWith('bay_') && !affectedAreas.includes(',') && !affectedAreas.includes('[')) {
    const bayId = parseInt(affectedAreas.replace('bay_', ''));
    if (!isNaN(bayId)) {
      return [bayId];
    }
  }
  
  try {
    const parsed = JSON.parse(affectedAreas);
    if (Array.isArray(parsed)) {
      const ids: number[] = [];
      for (const item of parsed) {
        if (typeof item === 'number') {
          ids.push(item);
        } else if (typeof item === 'string') {
          if (item.startsWith('bay_')) {
            const bayId = parseInt(item.replace('bay_', ''));
            if (!isNaN(bayId)) ids.push(bayId);
          } else {
            const bayId = parseInt(item);
            if (!isNaN(bayId)) ids.push(bayId);
          }
        }
      }
      if (ids.length > 0) return ids;
    }
  } catch {}
  
  const bayIds: number[] = [];
  const parts = affectedAreas.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.startsWith('bay_')) {
      const bayId = parseInt(part.replace('bay_', ''));
      if (!isNaN(bayId)) {
        bayIds.push(bayId);
      }
    } else {
      const parsed = parseInt(part);
      if (!isNaN(parsed)) {
        bayIds.push(parsed);
      }
    }
  }
  
  return bayIds;
}

function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

async function createAvailabilityBlocksForClosure(
  closureId: number,
  bayIds: number[],
  dates: string[],
  startTime: string | null,
  endTime: string | null,
  reason: string | null,
  createdBy: string | null
): Promise<void> {
  const blockStartTime = startTime || '08:00:00';
  const blockEndTime = endTime || '22:00:00';
  
  const insertValues = [];
  for (const bayId of bayIds) {
    for (const date of dates) {
      insertValues.push({
        bayId,
        blockDate: date,
        startTime: blockStartTime,
        endTime: blockEndTime,
        blockType: 'blocked',
        notes: reason || 'Facility closure',
        createdBy,
        closureId
      });
    }
  }
  
  if (insertValues.length > 0) {
    await db.insert(availabilityBlocks).values(insertValues);
    console.log(`[Closures] Created ${insertValues.length} availability blocks for closure #${closureId}`);
  }
}

async function deleteAvailabilityBlocksForClosure(closureId: number): Promise<void> {
  await db
    .delete(availabilityBlocks)
    .where(eq(availabilityBlocks.closureId, closureId));
  
  console.log(`[Closures] Deleted availability blocks for closure #${closureId}`);
}

async function createClosureCalendarEvents(
  calendarId: string,
  title: string,
  description: string,
  startDate: string,
  endDate: string,
  startTime: string | null,
  endTime: string | null
): Promise<string | null> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const isSameDay = startDate === endDate;
    const hasSpecificTimes = startTime && endTime;
    
    if (hasSpecificTimes) {
      const dates = getDatesBetween(startDate, endDate);
      const eventIds: string[] = [];
      
      for (const date of dates) {
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        
        const event = {
          summary: title,
          description: `${description}${dates.length > 1 ? `\n\n(Day ${dates.indexOf(date) + 1} of ${dates.length})` : ''}`,
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
        
        if (response.data.id) {
          eventIds.push(response.data.id);
        }
      }
      
      return eventIds.join(',');
    } else {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      
      const event = {
        summary: title,
        description,
        start: {
          date: startDate,
        },
        end: {
          date: endDatePlusOne.toISOString().split('T')[0],
        },
      };
      
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      
      return response.data.id || null;
    }
  } catch (error) {
    console.error('Error creating closure calendar event:', error);
    return null;
  }
}

async function deleteClosureCalendarEvents(calendarId: string, eventIds: string): Promise<void> {
  const ids = eventIds.split(',').filter(id => id.trim());
  
  for (const eventId of ids) {
    try {
      await deleteCalendarEvent(eventId.trim(), calendarId);
    } catch (error) {
      console.error(`Failed to delete calendar event ${eventId}:`, error);
    }
  }
}

router.get('/api/closures', async (req, res) => {
  try {
    const results = await db
      .select()
      .from(facilityClosures)
      .where(eq(facilityClosures.isActive, true))
      .orderBy(desc(facilityClosures.startDate), desc(facilityClosures.startTime));
    res.json(results);
  } catch (error: any) {
    if (!isProduction) console.error('Closures fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch closures' });
  }
});

router.post('/api/closures', isStaffOrAdmin, async (req, res) => {
  try {
    const { 
      title, 
      reason, 
      start_date, 
      start_time,
      end_date, 
      end_time,
      affected_areas, 
      notify_members,
      created_by 
    } = req.body;
    
    if (!start_date || !affected_areas) {
      return res.status(400).json({ error: 'Start date and affected areas are required' });
    }
    
    const [result] = await db.insert(facilityClosures).values({
      title: title || 'Facility Closure',
      reason,
      startDate: start_date,
      startTime: start_time || null,
      endDate: end_date || start_date,
      endTime: end_time || null,
      affectedAreas: affected_areas,
      isActive: true,
      createdBy: created_by
    }).returning();
    
    const closureId = result.id;
    const affectedBayIds = await getAffectedBayIds(affected_areas);
    const dates = getDatesBetween(start_date, end_date || start_date);
    
    if (affectedBayIds.length > 0) {
      await createAvailabilityBlocksForClosure(
        closureId,
        affectedBayIds,
        dates,
        start_time,
        end_time,
        reason,
        created_by
      );
    }
    
    let googleCalendarId: string | null = null;
    try {
      const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
      if (calendarId) {
        const affectedText = affected_areas === 'entire_facility' 
          ? 'Entire Facility' 
          : affected_areas === 'all_bays' 
            ? 'All Simulator Bays' 
            : affected_areas;
            
        const eventTitle = `CLOSURE: ${title || 'Facility Closure'}`;
        const eventDescription = `${reason || 'Scheduled closure'}\n\nAffected: ${affectedText}`;
        
        googleCalendarId = await createClosureCalendarEvents(
          calendarId,
          eventTitle,
          eventDescription,
          start_date,
          end_date || start_date,
          start_time,
          end_time
        );
        
        if (googleCalendarId) {
          await db
            .update(facilityClosures)
            .set({ googleCalendarId })
            .where(eq(facilityClosures.id, closureId));
          
          console.log(`[Closures] Created Google Calendar event(s) for closure #${closureId}`);
        }
      }
    } catch (calError) {
      console.error('[Closures] Failed to create calendar event:', calError);
    }
    
    if (notify_members && reason) {
      await sendPushNotificationToAllMembers({
        title: 'Facility Update',
        body: reason,
        url: '/announcements'
      });
    }
    
    res.json({ ...result, googleCalendarId });
  } catch (error: any) {
    if (!isProduction) console.error('Closure create error:', error);
    res.status(500).json({ error: 'Failed to create closure' });
  }
});

router.delete('/api/closures/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const closureId = parseInt(id);
    
    const [closure] = await db
      .select()
      .from(facilityClosures)
      .where(eq(facilityClosures.id, closureId));
    
    if (closure?.googleCalendarId) {
      try {
        const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
        if (calendarId) {
          await deleteClosureCalendarEvents(calendarId, closure.googleCalendarId);
          console.log(`[Closures] Deleted Google Calendar event(s) for closure #${closureId}`);
        }
      } catch (calError) {
        console.error('[Closures] Failed to delete calendar event:', calError);
      }
    }
    
    await deleteAvailabilityBlocksForClosure(closureId);
    
    await db
      .update(facilityClosures)
      .set({ isActive: false })
      .where(eq(facilityClosures.id, closureId));
    
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Closure delete error:', error);
    res.status(500).json({ error: 'Failed to delete closure' });
  }
});

export default router;
