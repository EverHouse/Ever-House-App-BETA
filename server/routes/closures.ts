import { Router } from 'express';
import { isProduction } from '../core/db';
import { db } from '../db';
import { facilityClosures, pushSubscriptions, users, bays, availabilityBlocks, announcements, notifications } from '../../shared/schema';
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
    
    let golfEventIds: string | null = null;
    let conferenceEventIds: string | null = null;
    
    try {
      const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
      const affectedText = affected_areas === 'entire_facility' 
        ? 'Entire Facility' 
        : affected_areas === 'all_bays' 
          ? 'All Simulator Bays' 
          : affected_areas;
          
      const eventTitle = `CLOSURE: ${title || 'Facility Closure'}`;
      const eventDescription = `${reason || 'Scheduled closure'}\n\nAffected: ${affectedText}`;
      
      // Determine what resources are affected
      const affectsConferenceRoom = affected_areas === 'entire_facility' || affected_areas === 'conference_room';
      const affectsBays = affected_areas === 'entire_facility' || affected_areas === 'all_bays' || 
        affected_areas.includes('bay_') || affectedBayIds.length > 0;
      
      // Create event in Booked Golf calendar (only if bays are affected)
      if (golfCalendarId && affectsBays) {
        golfEventIds = await createClosureCalendarEvents(
          golfCalendarId,
          eventTitle,
          eventDescription,
          start_date,
          end_date || start_date,
          start_time,
          end_time
        );
        
        if (golfEventIds) {
          console.log(`[Closures] Created Booked Golf calendar event(s) for closure #${closureId}`);
        }
      }
      
      // Create event in MBO_Conference_Room calendar (if conference room or entire facility is affected)
      if (affectsConferenceRoom) {
        const conferenceCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.conference.name);
        if (conferenceCalendarId) {
          conferenceEventIds = await createClosureCalendarEvents(
            conferenceCalendarId,
            eventTitle,
            eventDescription,
            start_date,
            end_date || start_date,
            start_time,
            end_time
          );
          
          if (conferenceEventIds) {
            console.log(`[Closures] Created MBO_Conference_Room calendar event(s) for closure #${closureId}`);
          }
        }
      }
      
      // Store event IDs in separate columns
      if (golfEventIds || conferenceEventIds) {
        await db
          .update(facilityClosures)
          .set({ 
            googleCalendarId: golfEventIds,
            conferenceCalendarId: conferenceEventIds
          })
          .where(eq(facilityClosures.id, closureId));
      }
    } catch (calError) {
      console.error('[Closures] Failed to create calendar event:', calError);
    }
    
    let announcementId: number | null = null;
    try {
      const affectedText = affected_areas === 'entire_facility' 
        ? 'Entire Facility' 
        : affected_areas === 'all_bays' 
          ? 'All Simulator Bays' 
          : affected_areas;
      
      const startDateFormatted = new Date(start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endDateFormatted = end_date && end_date !== start_date 
        ? new Date(end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;
      
      const dateRange = endDateFormatted ? `${startDateFormatted} - ${endDateFormatted}` : startDateFormatted;
      const timeRange = start_time && end_time ? ` (${start_time} - ${end_time})` : start_time ? ` from ${start_time}` : '';
      
      const announcementTitle = title || 'Facility Closure';
      const announcementMessage = `${reason || 'Scheduled maintenance'}\n\nAffected: ${affectedText}\nWhen: ${dateRange}${timeRange}`;
      
      const [announcement] = await db.insert(announcements).values({
        title: announcementTitle,
        message: announcementMessage,
        priority: 'high',
        isActive: true,
        closureId: closureId,
        startsAt: null,
        endsAt: end_date ? new Date(end_date) : new Date(start_date),
        createdBy: created_by
      }).returning();
      
      announcementId = announcement.id;
      console.log(`[Closures] Created announcement #${announcementId} for closure #${closureId}`);
    } catch (announcementError) {
      console.error('[Closures] Failed to create announcement:', announcementError);
    }
    
    if (notify_members) {
      const notificationTitle = title || 'Facility Closure';
      const affectedText = affected_areas === 'entire_facility' 
        ? 'Entire Facility' 
        : affected_areas === 'all_bays' 
          ? 'All Simulator Bays' 
          : affected_areas;
      const startDateFormatted = new Date(start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const notificationBody = reason 
        ? `${reason} - ${affectedText} on ${startDateFormatted}`
        : `${affectedText} will be closed on ${startDateFormatted}`;
      
      const memberUsers = await db
        .select({ email: users.email })
        .from(users)
        .where(or(eq(users.role, 'member'), isNull(users.role)));
      
      if (memberUsers.length > 0) {
        const notificationValues = memberUsers.map(m => ({
          userEmail: m.email,
          title: notificationTitle,
          message: notificationBody,
          type: 'closure',
          relatedId: closureId,
          relatedType: 'closure'
        }));
        
        await db.insert(notifications).values(notificationValues);
        console.log(`[Closures] Created in-app notifications for ${memberUsers.length} members`);
      }
      
      await sendPushNotificationToAllMembers({
        title: notificationTitle,
        body: notificationBody,
        url: '/announcements'
      });
    }
    
    res.json({ ...result, googleCalendarId: golfEventIds, conferenceCalendarId: conferenceEventIds, announcementId });
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
    
    // Delete calendar events from both calendars
    try {
      // Delete from Booked Golf calendar
      if (closure?.googleCalendarId) {
        const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
        if (golfCalendarId) {
          await deleteClosureCalendarEvents(golfCalendarId, closure.googleCalendarId);
          console.log(`[Closures] Deleted Booked Golf calendar event(s) for closure #${closureId}`);
        }
      }
      
      // Delete from MBO_Conference_Room calendar
      if (closure?.conferenceCalendarId) {
        const conferenceCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.conference.name);
        if (conferenceCalendarId) {
          await deleteClosureCalendarEvents(conferenceCalendarId, closure.conferenceCalendarId);
          console.log(`[Closures] Deleted MBO_Conference_Room calendar event(s) for closure #${closureId}`);
        }
      }
    } catch (calError) {
      console.error('[Closures] Failed to delete calendar event:', calError);
    }
    
    await deleteAvailabilityBlocksForClosure(closureId);
    
    try {
      await db
        .delete(announcements)
        .where(eq(announcements.closureId, closureId));
      console.log(`[Closures] Deleted announcement(s) for closure #${closureId}`);
    } catch (announcementError) {
      console.error('[Closures] Failed to delete announcement:', announcementError);
    }
    
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

// Update closure - also updates calendar events
router.put('/api/closures/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const closureId = parseInt(id);
    const { 
      title, 
      reason, 
      start_date, 
      start_time,
      end_date, 
      end_time,
      affected_areas
    } = req.body;
    
    // Get existing closure
    const [existing] = await db
      .select()
      .from(facilityClosures)
      .where(eq(facilityClosures.id, closureId));
    
    if (!existing) {
      return res.status(404).json({ error: 'Closure not found' });
    }
    
    // Update the closure record
    const [updated] = await db
      .update(facilityClosures)
      .set({
        title: title || existing.title,
        reason: reason !== undefined ? reason : existing.reason,
        startDate: start_date || existing.startDate,
        startTime: start_time !== undefined ? start_time : existing.startTime,
        endDate: end_date || existing.endDate,
        endTime: end_time !== undefined ? end_time : existing.endTime,
        affectedAreas: affected_areas || existing.affectedAreas
      })
      .where(eq(facilityClosures.id, closureId))
      .returning();
    
    // Update availability blocks if dates/times changed
    const datesChanged = start_date !== existing.startDate || end_date !== existing.endDate;
    const timesChanged = start_time !== existing.startTime || end_time !== existing.endTime;
    const areasChanged = affected_areas !== existing.affectedAreas;
    
    if (datesChanged || timesChanged || areasChanged) {
      // Delete old availability blocks and recreate
      await deleteAvailabilityBlocksForClosure(closureId);
      
      const newAffectedAreas = affected_areas || existing.affectedAreas;
      const affectedBayIds = await getAffectedBayIds(newAffectedAreas);
      const dates = getDatesBetween(
        start_date || existing.startDate,
        end_date || existing.endDate || start_date || existing.startDate
      );
      
      if (affectedBayIds.length > 0) {
        await createAvailabilityBlocksForClosure(
          closureId,
          affectedBayIds,
          dates,
          start_time !== undefined ? start_time : existing.startTime,
          end_time !== undefined ? end_time : existing.endTime,
          reason !== undefined ? reason : existing.reason,
          existing.createdBy
        );
      }
    }
    
    // Update calendar events if dates/times/title changed
    const hasCalendarEvents = existing.googleCalendarId || existing.conferenceCalendarId;
    if (hasCalendarEvents && (datesChanged || timesChanged || title !== existing.title || reason !== existing.reason || areasChanged)) {
      try {
        const newAffectedAreas = affected_areas || existing.affectedAreas;
        const affectedText = newAffectedAreas === 'entire_facility' 
          ? 'Entire Facility' 
          : newAffectedAreas === 'all_bays' 
            ? 'All Simulator Bays' 
            : newAffectedAreas;
            
        const eventTitle = `CLOSURE: ${title || existing.title}`;
        const eventDescription = `${reason !== undefined ? reason : existing.reason || 'Scheduled closure'}\n\nAffected: ${affectedText}`;
        const newStartDate = start_date || existing.startDate;
        const newEndDate = end_date || existing.endDate;
        const newStartTime = start_time !== undefined ? start_time : existing.startTime;
        const newEndTime = end_time !== undefined ? end_time : existing.endTime;
        
        const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
        const conferenceCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.conference.name);
        
        // Delete old events from both calendars
        if (existing.googleCalendarId && golfCalendarId) {
          await deleteClosureCalendarEvents(golfCalendarId, existing.googleCalendarId);
        }
        if (existing.conferenceCalendarId && conferenceCalendarId) {
          await deleteClosureCalendarEvents(conferenceCalendarId, existing.conferenceCalendarId);
        }
        
        // Create new events
        let newGolfEventIds: string | null = null;
        let newConferenceEventIds: string | null = null;
        
        // Determine what resources are affected
        const affectsConferenceRoom = newAffectedAreas === 'entire_facility' || newAffectedAreas === 'conference_room';
        const affectsBays = newAffectedAreas === 'entire_facility' || newAffectedAreas === 'all_bays' || 
          newAffectedAreas.includes('bay_') || affectedBayIds.length > 0;
        
        // Create golf calendar event only if bays are affected
        if (golfCalendarId && affectsBays) {
          newGolfEventIds = await createClosureCalendarEvents(
            golfCalendarId,
            eventTitle,
            eventDescription,
            newStartDate,
            newEndDate || newStartDate,
            newStartTime,
            newEndTime
          );
        }
        
        // Create conference room calendar event if conference room or entire facility is affected
        if (conferenceCalendarId && affectsConferenceRoom) {
          newConferenceEventIds = await createClosureCalendarEvents(
            conferenceCalendarId,
            eventTitle,
            eventDescription,
            newStartDate,
            newEndDate || newStartDate,
            newStartTime,
            newEndTime
          );
        }
        
        // Update stored calendar IDs in separate columns
        await db
          .update(facilityClosures)
          .set({ 
            googleCalendarId: newGolfEventIds,
            conferenceCalendarId: newConferenceEventIds
          })
          .where(eq(facilityClosures.id, closureId));
        
        console.log(`[Closures] Updated Google Calendar event(s) for closure #${closureId}`);
      } catch (calError) {
        console.error('[Closures] Failed to update calendar events:', calError);
      }
    }
    
    // Update linked announcement if exists
    try {
      const newAffectedAreas = affected_areas || existing.affectedAreas;
      const affectedText = newAffectedAreas === 'entire_facility' 
        ? 'Entire Facility' 
        : newAffectedAreas === 'all_bays' 
          ? 'All Simulator Bays' 
          : newAffectedAreas;
      
      const newStartDate = start_date || existing.startDate;
      const newEndDate = end_date || existing.endDate;
      const startDateFormatted = new Date(newStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endDateFormatted = newEndDate && newEndDate !== newStartDate 
        ? new Date(newEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;
      
      const newStartTime = start_time !== undefined ? start_time : existing.startTime;
      const newEndTime = end_time !== undefined ? end_time : existing.endTime;
      const dateRange = endDateFormatted ? `${startDateFormatted} - ${endDateFormatted}` : startDateFormatted;
      const timeRange = newStartTime && newEndTime ? ` (${newStartTime} - ${newEndTime})` : newStartTime ? ` from ${newStartTime}` : '';
      
      const announcementTitle = title || existing.title;
      const announcementMessage = `${reason !== undefined ? reason : existing.reason || 'Scheduled maintenance'}\n\nAffected: ${affectedText}\nWhen: ${dateRange}${timeRange}`;
      
      await db
        .update(announcements)
        .set({
          title: announcementTitle,
          message: announcementMessage,
          startsAt: new Date(newStartDate),
          endsAt: newEndDate ? new Date(newEndDate) : new Date(newStartDate)
        })
        .where(eq(announcements.closureId, closureId));
      
      console.log(`[Closures] Updated announcement for closure #${closureId}`);
    } catch (announcementError) {
      console.error('[Closures] Failed to update announcement:', announcementError);
    }
    
    res.json(updated);
  } catch (error: any) {
    if (!isProduction) console.error('Closure update error:', error);
    res.status(500).json({ error: 'Failed to update closure' });
  }
});

export default router;
