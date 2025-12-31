import { Router } from 'express';
import { isProduction } from '../core/db';
import { db } from '../db';
import { facilityClosures, pushSubscriptions, users, bays, availabilityBlocks, announcements, notifications, resources } from '../../shared/schema';
import { eq, desc, or, isNull, inArray } from 'drizzle-orm';
import webpush from 'web-push';
import { isStaffOrAdmin } from '../core/middleware';
import { getCalendarIdByName, deleteCalendarEvent, CALENDAR_CONFIG, syncInternalCalendarToClosures } from '../core/calendar';
import { getGoogleCalendarClient } from '../core/integrations';
import { createPacificDate, parseLocalDate, addDaysToPacificDate } from '../utils/dateUtils';

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

async function getConferenceRoomId(): Promise<number | null> {
  const result = await db
    .select({ id: resources.id })
    .from(resources)
    .where(eq(resources.type, 'conference_room'))
    .limit(1);
  return result.length > 0 ? result[0].id : null;
}

async function getAffectedBayIds(affectedAreas: string): Promise<number[]> {
  const idSet = new Set<number>();
  
  if (affectedAreas === 'entire_facility') {
    const activeBays = await db
      .select({ id: bays.id })
      .from(bays)
      .where(eq(bays.isActive, true));
    activeBays.forEach(bay => idSet.add(bay.id));
    const allResources = await db.select({ id: resources.id }).from(resources);
    allResources.forEach(r => idSet.add(r.id));
    return Array.from(idSet);
  }
  
  if (affectedAreas === 'all_bays') {
    const activeBays = await db
      .select({ id: bays.id })
      .from(bays)
      .where(eq(bays.isActive, true));
    activeBays.forEach(bay => idSet.add(bay.id));
    return Array.from(idSet);
  }
  
  if (affectedAreas === 'conference_room' || affectedAreas === 'Conference Room') {
    const conferenceRoomId = await getConferenceRoomId();
    return conferenceRoomId ? [conferenceRoomId] : [];
  }
  
  if (affectedAreas.startsWith('bay_') && !affectedAreas.includes(',') && !affectedAreas.includes('[')) {
    const bayId = parseInt(affectedAreas.replace('bay_', ''));
    if (!isNaN(bayId)) {
      return [bayId];
    }
  }
  
  const conferenceRoomId = await getConferenceRoomId();
  
  try {
    const parsed = JSON.parse(affectedAreas);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'number') {
          idSet.add(item);
        } else if (typeof item === 'string') {
          if (item.startsWith('bay_')) {
            const bayId = parseInt(item.replace('bay_', ''));
            if (!isNaN(bayId)) idSet.add(bayId);
          } else if (item === 'conference_room' || item.toLowerCase() === 'conference room') {
            if (conferenceRoomId) idSet.add(conferenceRoomId);
          } else {
            const bayId = parseInt(item);
            if (!isNaN(bayId)) idSet.add(bayId);
          }
        }
      }
      if (idSet.size > 0) return Array.from(idSet);
    }
  } catch (parseError) {
    console.warn('[getAffectedBayIds] Failed to parse JSON affectedAreas:', affectedAreas, parseError);
  }
  
  const parts = affectedAreas.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (part.startsWith('bay_')) {
      const bayId = parseInt(part.replace('bay_', ''));
      if (!isNaN(bayId)) {
        idSet.add(bayId);
      }
    } else if (part === 'conference_room' || part.toLowerCase() === 'conference room') {
      if (conferenceRoomId) idSet.add(conferenceRoomId);
    } else if (part.match(/^Bay\s*(\d+)$/i)) {
      const match = part.match(/^Bay\s*(\d+)$/i);
      if (match) {
        idSet.add(parseInt(match[1]));
      }
    } else if (part.match(/^Simulator\s*Bay\s*(\d+)$/i)) {
      const match = part.match(/^Simulator\s*Bay\s*(\d+)$/i);
      if (match) {
        idSet.add(parseInt(match[1]));
      }
    } else {
      const parsed = parseInt(part);
      if (!isNaN(parsed)) {
        idSet.add(parsed);
      }
    }
  }
  
  return Array.from(idSet);
}

function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;
  
  while (current <= endDate) {
    dates.push(current);
    current = addDaysToPacificDate(current, 1);
  }
  
  return dates;
}

async function formatAffectedAreasForDisplay(affectedAreas: string): Promise<string> {
  if (affectedAreas === 'entire_facility') return 'Entire Facility';
  if (affectedAreas === 'all_bays') return 'All Simulator Bays';
  if (affectedAreas === 'conference_room') return 'Conference Room';
  
  if (affectedAreas.startsWith('bay_')) {
    const bayId = parseInt(affectedAreas.replace('bay_', ''));
    if (!isNaN(bayId)) {
      const [bay] = await db.select({ name: bays.name }).from(bays).where(eq(bays.id, bayId));
      return bay ? bay.name : affectedAreas;
    }
  }
  
  return affectedAreas;
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
        const startDateTime = createPacificDate(date, startTime);
        const endDateTime = createPacificDate(date, endTime);
        
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
      const endDatePlusOne = addDaysToPacificDate(endDate, 1);
      
      const event = {
        summary: title,
        description,
        start: {
          date: startDate,
        },
        end: {
          date: endDatePlusOne,
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
      .orderBy(facilityClosures.startDate, facilityClosures.startTime);
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
    let internalEventIds: string | null = null;
    
    try {
      const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
      const affectedText = await formatAffectedAreasForDisplay(affected_areas);
          
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
      
      // Always create event in Internal Calendar for all closures
      const internalCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.internal.name);
      if (internalCalendarId) {
        internalEventIds = await createClosureCalendarEvents(
          internalCalendarId,
          eventTitle,
          eventDescription,
          start_date,
          end_date || start_date,
          start_time,
          end_time
        );
        
        if (internalEventIds) {
          console.log(`[Closures] Created Internal Calendar event(s) for closure #${closureId}`);
        }
      }
      
      // Store event IDs in separate columns
      if (golfEventIds || conferenceEventIds || internalEventIds) {
        await db
          .update(facilityClosures)
          .set({ 
            googleCalendarId: golfEventIds,
            conferenceCalendarId: conferenceEventIds,
            internalCalendarId: internalEventIds
          })
          .where(eq(facilityClosures.id, closureId));
      }
    } catch (calError) {
      console.error('[Closures] Failed to create calendar event:', calError);
    }
    
    const warnings: string[] = [];
    
    if (notify_members) {
      const notificationTitle = title || 'Facility Closure';
      const affectedText = affected_areas === 'entire_facility' 
        ? 'Entire Facility' 
        : affected_areas === 'all_bays' 
          ? 'All Simulator Bays' 
          : affected_areas;
      const [sny, snm, snd] = start_date.split('-').map(Number);
      const monthsNotif = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startDateFormattedNotif = `${monthsNotif[snm - 1]} ${snd}`;
      const notificationBody = reason 
        ? `${reason} - ${affectedText} on ${startDateFormattedNotif}`
        : `${affectedText} will be closed on ${startDateFormattedNotif}`;
      
      try {
        const memberUsers = await db
          .select({ email: users.email })
          .from(users)
          .where(or(eq(users.role, 'member'), isNull(users.role)));
        
        // Filter out users with null/empty emails
        const membersWithEmails = memberUsers.filter(m => m.email && m.email.trim());
        
        if (membersWithEmails.length > 0) {
          const notificationValues = membersWithEmails.map(m => ({
            userEmail: m.email!,
            title: notificationTitle,
            message: notificationBody,
            type: 'closure',
            relatedId: closureId,
            relatedType: 'closure'
          }));
          
          await db.insert(notifications).values(notificationValues);
          console.log(`[Closures] Created in-app notifications for ${membersWithEmails.length} members`);
        }
      } catch (notifError) {
        console.error('[Closures] Failed to create in-app notifications:', notifError);
        warnings.push('Failed to send in-app notifications to members');
      }
      
      try {
        await sendPushNotificationToAllMembers({
          title: notificationTitle,
          body: notificationBody,
          url: '/announcements'
        });
      } catch (pushError) {
        console.error('[Closures] Failed to send push notifications:', pushError);
        warnings.push('Failed to send push notifications to members');
      }
    }
    
    res.json({ 
      ...result, 
      googleCalendarId: golfEventIds, 
      conferenceCalendarId: conferenceEventIds, 
      internalCalendarId: internalEventIds,
      warnings: warnings.length > 0 ? warnings : undefined
    });
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
    
    // Delete calendar events from all calendars
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
      
      // Delete from Internal Calendar
      if (closure?.internalCalendarId) {
        const internalCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.internal.name);
        if (internalCalendarId) {
          await deleteClosureCalendarEvents(internalCalendarId, closure.internalCalendarId);
          console.log(`[Closures] Deleted Internal Calendar event(s) for closure #${closureId}`);
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
    const hasCalendarEvents = existing.googleCalendarId || existing.conferenceCalendarId || existing.internalCalendarId;
    if (hasCalendarEvents && (datesChanged || timesChanged || title !== existing.title || reason !== existing.reason || areasChanged)) {
      try {
        const newAffectedAreas = affected_areas || existing.affectedAreas || 'entire_facility';
        const affectedText = await formatAffectedAreasForDisplay(newAffectedAreas);
            
        const eventTitle = `CLOSURE: ${title || existing.title}`;
        const eventDescription = `${reason !== undefined ? reason : existing.reason || 'Scheduled closure'}\n\nAffected: ${affectedText}`;
        const newStartDate = start_date || existing.startDate;
        const newEndDate = end_date || existing.endDate;
        const newStartTime = start_time !== undefined ? start_time : existing.startTime;
        const newEndTime = end_time !== undefined ? end_time : existing.endTime;
        
        const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
        const conferenceCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.conference.name);
        const internalCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.internal.name);
        
        // Delete old events from all calendars
        if (existing.googleCalendarId && golfCalendarId) {
          await deleteClosureCalendarEvents(golfCalendarId, existing.googleCalendarId);
        }
        if (existing.conferenceCalendarId && conferenceCalendarId) {
          await deleteClosureCalendarEvents(conferenceCalendarId, existing.conferenceCalendarId);
        }
        if (existing.internalCalendarId && internalCalendarId) {
          await deleteClosureCalendarEvents(internalCalendarId, existing.internalCalendarId);
        }
        
        // Create new events
        let newGolfEventIds: string | null = null;
        let newConferenceEventIds: string | null = null;
        let newInternalEventIds: string | null = null;
        
        // Determine what resources are affected
        const affectsConferenceRoom = newAffectedAreas === 'entire_facility' || newAffectedAreas === 'conference_room';
        const calendarAffectedBayIds = await getAffectedBayIds(newAffectedAreas);
        const affectsBays = newAffectedAreas === 'entire_facility' || newAffectedAreas === 'all_bays' || 
          newAffectedAreas.includes('bay_') || calendarAffectedBayIds.length > 0;
        
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
        
        // Always create Internal Calendar event for all closures
        if (internalCalendarId) {
          newInternalEventIds = await createClosureCalendarEvents(
            internalCalendarId,
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
            conferenceCalendarId: newConferenceEventIds,
            internalCalendarId: newInternalEventIds
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
      const [usy, usm, usd] = newStartDate.split('-').map(Number);
      const monthsUpdate = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startDateFormatted = `${monthsUpdate[usm - 1]} ${usd}`;
      const endDateFormatted = newEndDate && newEndDate !== newStartDate 
        ? (() => { const [uey, uem, ued] = newEndDate.split('-').map(Number); return `${monthsUpdate[uem - 1]} ${ued}`; })()
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
          startsAt: createPacificDate(newStartDate, '00:00:00'),
          endsAt: newEndDate ? createPacificDate(newEndDate, '23:59:59') : createPacificDate(newStartDate, '23:59:59')
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

router.post('/api/closures/backfill-blocks', isStaffOrAdmin, async (req, res) => {
  try {
    const allClosures = await db
      .select()
      .from(facilityClosures)
      .where(eq(facilityClosures.isActive, true));
    
    let totalBlocksCreated = 0;
    const results: { closureId: number; title: string; blocksCreated: number }[] = [];
    
    for (const closure of allClosures) {
      const existingBlocks = await db
        .select({ id: availabilityBlocks.id })
        .from(availabilityBlocks)
        .where(eq(availabilityBlocks.closureId, closure.id));
      
      if (existingBlocks.length > 0) {
        results.push({ closureId: closure.id, title: closure.title, blocksCreated: 0 });
        continue;
      }
      
      const affectedBayIds = await getAffectedBayIds(closure.affectedAreas || 'entire_facility');
      const dates = getDatesBetween(closure.startDate, closure.endDate || closure.startDate);
      
      if (affectedBayIds.length > 0) {
        const blockStartTime = closure.startTime || '08:00:00';
        const blockEndTime = closure.endTime || '22:00:00';
        
        const insertValues = [];
        for (const bayId of affectedBayIds) {
          for (const date of dates) {
            insertValues.push({
              bayId,
              blockDate: date,
              startTime: blockStartTime,
              endTime: blockEndTime,
              blockType: 'blocked',
              notes: closure.reason || 'Facility closure',
              createdBy: closure.createdBy,
              closureId: closure.id
            });
          }
        }
        
        if (insertValues.length > 0) {
          await db.insert(availabilityBlocks).values(insertValues);
          totalBlocksCreated += insertValues.length;
          results.push({ closureId: closure.id, title: closure.title, blocksCreated: insertValues.length });
          console.log(`[Backfill] Created ${insertValues.length} blocks for closure #${closure.id}: ${closure.title}`);
        }
      } else {
        results.push({ closureId: closure.id, title: closure.title, blocksCreated: 0 });
      }
    }
    
    console.log(`[Backfill] Complete: ${totalBlocksCreated} total blocks created for ${allClosures.length} closures`);
    res.json({ 
      success: true, 
      totalClosures: allClosures.length,
      totalBlocksCreated,
      details: results 
    });
  } catch (error: any) {
    console.error('Backfill error:', error);
    res.status(500).json({ error: 'Failed to backfill availability blocks' });
  }
});

// Manual sync endpoint for closures from Internal Calendar
router.post('/api/closures/sync', isStaffOrAdmin, async (req, res) => {
  try {
    console.log('[Manual Sync] Starting Internal Calendar closure sync...');
    const result = await syncInternalCalendarToClosures();
    
    if (result.error) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: 'Closures synced successfully',
      stats: result
    });
  } catch (error: any) {
    if (!isProduction) console.error('Manual closure sync error:', error);
    res.status(500).json({ error: 'Failed to sync closures' });
  }
});

export default router;
