import { Router } from 'express';
import { db } from '../db';
import { bays, availabilityBlocks, bookingRequests, notifications, facilityClosures } from '../../shared/schema';
import { eq, and, or, gte, lte, gt, lt, desc, asc, ne, sql } from 'drizzle-orm';
import { isProduction } from '../core/db';
import { getGoogleCalendarClient } from '../core/integrations';
import { CALENDAR_CONFIG, getCalendarIdByName, createCalendarEvent, createCalendarEventOnCalendar, deleteCalendarEvent } from '../core/calendar';
import { sendPushNotification, sendPushNotificationToStaff } from './push';
import { checkDailyBookingLimit } from '../core/tierService';
import { notifyAllStaff } from '../core/staffNotifications';

const router = Router();

// Helper to dismiss all staff notifications for a booking request when it's processed
async function dismissStaffNotificationsForBooking(bookingId: number): Promise<void> {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.relatedId, bookingId),
        eq(notifications.relatedType, 'booking_request'),
        eq(notifications.type, 'booking')
      ));
  } catch (error) {
    console.error('Failed to dismiss staff notifications:', error);
  }
}

// Helper to parse time string to minutes
function parseTimeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

// Helper to get affected bay IDs from closure affected areas
async function getAffectedBayIdsFromClosure(affectedAreas: string): Promise<number[]> {
  if (affectedAreas === 'entire_facility' || affectedAreas === 'all_bays') {
    const activeBays = await db
      .select({ id: bays.id })
      .from(bays)
      .where(eq(bays.isActive, true));
    return activeBays.map(bay => bay.id);
  }
  
  if (affectedAreas === 'conference_room') {
    return [11]; // Conference room bay ID
  }
  
  if (affectedAreas.startsWith('bay_') && !affectedAreas.includes(',') && !affectedAreas.includes('[')) {
    const bayId = parseInt(affectedAreas.replace('bay_', ''));
    if (!isNaN(bayId)) return [bayId];
  }
  
  if (affectedAreas.includes(',') && !affectedAreas.startsWith('[')) {
    const ids: number[] = [];
    for (const item of affectedAreas.split(',')) {
      const trimmed = item.trim();
      if (trimmed.startsWith('bay_')) {
        const bayId = parseInt(trimmed.replace('bay_', ''));
        if (!isNaN(bayId)) ids.push(bayId);
      } else if (trimmed === 'conference_room') {
        ids.push(11);
      } else {
        const bayId = parseInt(trimmed);
        if (!isNaN(bayId)) ids.push(bayId);
      }
    }
    return ids;
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
          } else if (item === 'conference_room') {
            ids.push(11);
          } else {
            const bayId = parseInt(item);
            if (!isNaN(bayId)) ids.push(bayId);
          }
        }
      }
      return ids;
    }
  } catch {}
  
  return [];
}

// Helper to check for closure conflicts
async function checkClosureConflict(bayId: number, bookingDate: string, startTime: string, endTime: string): Promise<{ hasConflict: boolean; closureTitle?: string }> {
  const activeClosures = await db
    .select()
    .from(facilityClosures)
    .where(and(
      eq(facilityClosures.isActive, true),
      sql`${facilityClosures.startDate} <= ${bookingDate}`,
      sql`${facilityClosures.endDate} >= ${bookingDate}`
    ));
  
  const bookingStartMinutes = parseTimeToMinutes(startTime);
  const bookingEndMinutes = parseTimeToMinutes(endTime);
  
  for (const closure of activeClosures) {
    const affectedBayIds = await getAffectedBayIdsFromClosure(closure.affectedAreas);
    
    if (!affectedBayIds.includes(bayId)) continue;
    
    // Full-day closure (no specific times)
    if (!closure.startTime && !closure.endTime) {
      return { hasConflict: true, closureTitle: closure.title || 'Facility Closure' };
    }
    
    const closureStartMinutes = closure.startTime ? parseTimeToMinutes(closure.startTime) : 0;
    const closureEndMinutes = closure.endTime ? parseTimeToMinutes(closure.endTime) : 24 * 60;
    
    // Check for time overlap
    if (bookingStartMinutes < closureEndMinutes && bookingEndMinutes > closureStartMinutes) {
      return { hasConflict: true, closureTitle: closure.title || 'Facility Closure' };
    }
  }
  
  return { hasConflict: false };
}

router.get('/api/bays', async (req, res) => {
  try {
    const result = await db.select().from(bays).where(eq(bays.isActive, true)).orderBy(asc(bays.name));
    res.json(result);
  } catch (error: any) {
    console.error('Bays error:', error);
    res.status(500).json({ error: 'Failed to fetch bays' });
  }
});

router.get('/api/bays/:bayId/availability', async (req, res) => {
  try {
    const { bayId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const bookingsResult = await db.select({
      start_time: bookingRequests.startTime,
      end_time: bookingRequests.endTime,
      user_name: bookingRequests.userName
    })
    .from(bookingRequests)
    .where(and(
      eq(bookingRequests.bayId, parseInt(bayId)),
      eq(bookingRequests.requestDate, date as string),
      eq(bookingRequests.status, 'approved')
    ))
    .orderBy(asc(bookingRequests.startTime));
    
    const blocksResult = await db.select({
      start_time: availabilityBlocks.startTime,
      end_time: availabilityBlocks.endTime,
      block_type: availabilityBlocks.blockType,
      notes: availabilityBlocks.notes
    })
    .from(availabilityBlocks)
    .where(and(
      eq(availabilityBlocks.bayId, parseInt(bayId)),
      eq(availabilityBlocks.blockDate, date as string)
    ))
    .orderBy(asc(availabilityBlocks.startTime));
    
    let calendarBlocks: any[] = [];
    try {
      const calendar = await getGoogleCalendarClient();
      const startTime = new Date(date as string);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(date as string);
      endTime.setHours(23, 59, 59, 999);
      
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: 'primary' }],
        },
      });
      
      const busySlots = response.data.calendars?.primary?.busy || [];
      calendarBlocks = busySlots.map((slot: any) => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        const startPT = start.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false });
        const endPT = end.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false });
        return {
          start_time: startPT,
          end_time: endPT,
          block_type: 'calendar',
          notes: 'Google Calendar event'
        };
      });
    } catch (calError) {
      if (!isProduction) console.log('Calendar availability fetch skipped:', (calError as Error).message);
    }
    
    res.json({
      bookings: bookingsResult,
      blocks: [...blocksResult, ...calendarBlocks]
    });
  } catch (error: any) {
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

router.get('/api/booking-requests', async (req, res) => {
  try {
    const { user_email, status, include_all } = req.query;
    
    const conditions: any[] = [];
    
    if (user_email && !include_all) {
      conditions.push(eq(bookingRequests.userEmail, user_email as string));
    }
    
    if (status) {
      conditions.push(eq(bookingRequests.status, status as string));
    }
    
    const result = await db.select({
      id: bookingRequests.id,
      user_email: bookingRequests.userEmail,
      user_name: bookingRequests.userName,
      bay_id: bookingRequests.bayId,
      bay_preference: bookingRequests.bayPreference,
      request_date: bookingRequests.requestDate,
      start_time: bookingRequests.startTime,
      duration_minutes: bookingRequests.durationMinutes,
      end_time: bookingRequests.endTime,
      notes: bookingRequests.notes,
      status: bookingRequests.status,
      staff_notes: bookingRequests.staffNotes,
      suggested_time: bookingRequests.suggestedTime,
      reviewed_by: bookingRequests.reviewedBy,
      reviewed_at: bookingRequests.reviewedAt,
      created_at: bookingRequests.createdAt,
      updated_at: bookingRequests.updatedAt,
      calendar_event_id: bookingRequests.calendarEventId,
      bay_name: bays.name
    })
    .from(bookingRequests)
    .leftJoin(bays, eq(bookingRequests.bayId, bays.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookingRequests.createdAt));
    
    res.json(result);
  } catch (error: any) {
    console.error('Booking requests error:', error);
    res.status(500).json({ error: 'Failed to fetch booking requests' });
  }
});

router.post('/api/booking-requests', async (req, res) => {
  try {
    const { user_email, user_name, bay_id, bay_preference, request_date, start_time, duration_minutes, notes, user_tier } = req.body;
    
    if (!user_email || !request_date || !start_time || !duration_minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const limitCheck = await checkDailyBookingLimit(user_email, request_date, duration_minutes, user_tier);
    if (!limitCheck.allowed) {
      return res.status(403).json({ 
        error: limitCheck.reason,
        remainingMinutes: limitCheck.remainingMinutes
      });
    }
    
    const [hours, mins] = start_time.split(':').map(Number);
    const totalMins = hours * 60 + mins + duration_minutes;
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;
    const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
    
    const result = await db.insert(bookingRequests).values({
      userEmail: user_email,
      userName: user_name,
      bayId: bay_id || null,
      bayPreference: bay_preference,
      requestDate: request_date,
      startTime: start_time,
      durationMinutes: duration_minutes,
      endTime: end_time,
      notes: notes
    }).returning();
    
    const row = result[0];
    
    // Send notifications in background - don't block the response
    const formattedDate = new Date(row.requestDate).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    const formattedTime = row.startTime?.substring(0, 5) || start_time.substring(0, 5);
    const staffMessage = `${row.userName || row.userEmail} requested ${formattedDate} at ${formattedTime}`;
    
    // In-app notification to all staff - don't fail booking if this fails
    notifyAllStaff(
      'New Golf Booking Request',
      staffMessage,
      'booking',
      row.id,
      'booking_request'
    ).catch(err => console.error('Staff in-app notification failed:', err));
    
    // Push notification - already non-blocking
    sendPushNotificationToStaff({
      title: 'New Golf Booking Request',
      body: staffMessage,
      url: '/#/admin'
    }).catch(err => console.error('Staff push notification failed:', err));
    
    res.status(201).json({
      id: row.id,
      user_email: row.userEmail,
      user_name: row.userName,
      bay_id: row.bayId,
      bay_preference: row.bayPreference,
      request_date: row.requestDate,
      start_time: row.startTime,
      duration_minutes: row.durationMinutes,
      end_time: row.endTime,
      notes: row.notes,
      status: row.status,
      staff_notes: row.staffNotes,
      suggested_time: row.suggestedTime,
      reviewed_by: row.reviewedBy,
      reviewed_at: row.reviewedAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      calendar_event_id: row.calendarEventId
    });
  } catch (error: any) {
    console.error('Booking request creation error:', error);
    res.status(500).json({ error: 'Failed to create booking request' });
  }
});

router.put('/api/booking-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staff_notes, suggested_time, reviewed_by, bay_id } = req.body;
    
    if (!['pending', 'approved', 'declined', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const formatRow = (row: any) => ({
      id: row.id,
      user_email: row.userEmail,
      user_name: row.userName,
      bay_id: row.bayId,
      bay_preference: row.bayPreference,
      request_date: row.requestDate,
      start_time: row.startTime,
      duration_minutes: row.durationMinutes,
      end_time: row.endTime,
      notes: row.notes,
      status: row.status,
      staff_notes: row.staffNotes,
      suggested_time: row.suggestedTime,
      reviewed_by: row.reviewedBy,
      reviewed_at: row.reviewedAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      calendar_event_id: row.calendarEventId
    });
    
    if (status === 'approved') {
      const requestResult = await db.select().from(bookingRequests).where(eq(bookingRequests.id, parseInt(id)));
      if (requestResult.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      const req_data = requestResult[0];
      const assignedBayId = bay_id || req_data.bayId;
      
      if (!assignedBayId) {
        return res.status(400).json({ error: 'Bay must be assigned before approval' });
      }
      
      const conflicts = await db.select().from(bookingRequests).where(and(
        eq(bookingRequests.bayId, assignedBayId),
        eq(bookingRequests.requestDate, req_data.requestDate),
        eq(bookingRequests.status, 'approved'),
        ne(bookingRequests.id, parseInt(id)),
        or(
          and(lte(bookingRequests.startTime, req_data.startTime), gt(bookingRequests.endTime, req_data.startTime)),
          and(lt(bookingRequests.startTime, req_data.endTime), gte(bookingRequests.endTime, req_data.endTime)),
          and(gte(bookingRequests.startTime, req_data.startTime), lte(bookingRequests.endTime, req_data.endTime))
        )
      ));
      
      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
      }
      
      // Check for facility closure conflicts
      const closureCheck = await checkClosureConflict(
        assignedBayId,
        req_data.requestDate,
        req_data.startTime,
        req_data.endTime
      );
      
      if (closureCheck.hasConflict) {
        return res.status(409).json({ 
          error: 'Cannot approve booking during closure',
          message: `This time slot conflicts with "${closureCheck.closureTitle}". Please decline this request or wait until the closure ends.`
        });
      }
      
      const bayResult = await db.select({ name: bays.name }).from(bays).where(eq(bays.id, assignedBayId));
      const bayName = bayResult[0]?.name || 'Simulator';
      
      let calendarEventId: string | null = null;
      try {
        const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
        if (golfCalendarId) {
          const summary = `Simulator: ${req_data.userName || req_data.userEmail}`;
          const description = `Bay: ${bayName}\nMember: ${req_data.userEmail}\nDuration: ${req_data.durationMinutes} minutes${req_data.notes ? '\nNotes: ' + req_data.notes : ''}`;
          calendarEventId = await createCalendarEventOnCalendar(
            golfCalendarId,
            summary,
            description,
            req_data.requestDate,
            req_data.startTime,
            req_data.endTime
          );
        } else {
          calendarEventId = await createCalendarEvent(req_data, bayName);
        }
      } catch (calError) {
        console.error('Calendar sync failed (non-blocking):', calError);
      }
      
      const result = await db.update(bookingRequests)
        .set({
          status: status,
          staffNotes: staff_notes,
          suggestedTime: suggested_time,
          reviewedBy: reviewed_by,
          reviewedAt: new Date(),
          bayId: assignedBayId,
          calendarEventId: calendarEventId,
          updatedAt: new Date()
        })
        .where(eq(bookingRequests.id, parseInt(id)))
        .returning();
      
      const updated = result[0];
      const approvalMessage = `Your simulator booking for ${updated.requestDate} at ${updated.startTime.substring(0, 5)} has been approved.`;
      
      await db.insert(notifications).values({
        userEmail: updated.userEmail,
        title: 'Booking Request Approved',
        message: approvalMessage,
        type: 'booking_approved',
        relatedId: updated.id,
        relatedType: 'booking_request'
      });
      
      await sendPushNotification(updated.userEmail, {
        title: 'Booking Approved!',
        body: approvalMessage,
        url: '/#/sims'
      });
      
      // Dismiss all staff notifications for this booking request
      await dismissStaffNotificationsForBooking(updated.id);
      
      return res.json(formatRow(result[0]));
    }
    
    if (status === 'declined') {
      const result = await db.update(bookingRequests)
        .set({
          status: status,
          staffNotes: staff_notes,
          suggestedTime: suggested_time,
          reviewedBy: reviewed_by,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(bookingRequests.id, parseInt(id)))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Booking request not found' });
      }
      
      const updated = result[0];
      const declineMessage = suggested_time 
        ? `Your simulator booking request for ${updated.requestDate} was declined. Suggested alternative: ${suggested_time.substring(0, 5)}`
        : `Your simulator booking request for ${updated.requestDate} was declined.${staff_notes ? ' Note: ' + staff_notes : ''}`;
      
      await db.insert(notifications).values({
        userEmail: updated.userEmail,
        title: 'Booking Request Declined',
        message: declineMessage,
        type: 'booking_declined',
        relatedId: updated.id,
        relatedType: 'booking_request'
      });
      
      await sendPushNotification(updated.userEmail, {
        title: 'Booking Request Update',
        body: declineMessage,
        url: '/#/sims'
      });
      
      // Dismiss all staff notifications for this booking request
      await dismissStaffNotificationsForBooking(updated.id);
      
      return res.json(formatRow(result[0]));
    }
    
    if (status === 'cancelled') {
      const existing = await db.select({
        calendarEventId: bookingRequests.calendarEventId,
        userEmail: bookingRequests.userEmail,
        userName: bookingRequests.userName,
        requestDate: bookingRequests.requestDate,
        startTime: bookingRequests.startTime,
        status: bookingRequests.status
      })
        .from(bookingRequests)
        .where(eq(bookingRequests.id, parseInt(id)));
      
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Booking request not found' });
      }
      
      const bookingData = existing[0];
      
      // Delete calendar event if exists
      if (bookingData?.calendarEventId) {
        try {
          const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
          await deleteCalendarEvent(bookingData.calendarEventId, golfCalendarId || 'primary');
        } catch (calError) {
          console.error('Failed to delete calendar event (non-blocking):', calError);
        }
      }
      
      // Only send cancellation notifications if booking was previously approved
      if (bookingData && bookingData.status === 'approved') {
        const { cancelled_by } = req.body;
        const memberEmail = bookingData.userEmail;
        const memberName = bookingData.userName || memberEmail;
        const bookingDate = bookingData.requestDate;
        const bookingTime = bookingData.startTime?.substring(0, 5) || '';
        
        // Determine if member cancelled (cancelled_by matches member email) or staff cancelled
        const memberCancelled = cancelled_by === memberEmail;
        
        if (memberCancelled) {
          // Member cancelled - notify all staff
          const staffMessage = `${memberName} has cancelled their booking for ${bookingDate} at ${bookingTime}.`;
          
          await db.insert(notifications).values({
            userEmail: 'staff@evenhouse.app', // Generic staff notification marker
            title: 'Booking Cancelled by Member',
            message: staffMessage,
            type: 'booking_cancelled',
            relatedId: parseInt(id),
            relatedType: 'booking_request'
          });
          
          await sendPushNotificationToStaff({
            title: 'Booking Cancelled',
            body: staffMessage,
            url: '/#/staff'
          });
        } else {
          // Staff cancelled - notify the member
          const memberMessage = `Your booking for ${bookingDate} at ${bookingTime} has been cancelled by staff.${staff_notes ? ' Note: ' + staff_notes : ''}`;
          
          await db.insert(notifications).values({
            userEmail: memberEmail,
            title: 'Booking Cancelled',
            message: memberMessage,
            type: 'booking_cancelled',
            relatedId: parseInt(id),
            relatedType: 'booking_request'
          });
          
          await sendPushNotification(memberEmail, {
            title: 'Booking Cancelled',
            body: memberMessage,
            url: '/#/sims'
          });
        }
      }
      
      // Always dismiss staff notifications for cancelled bookings
      await dismissStaffNotificationsForBooking(parseInt(id));
    }
    
    const result = await db.update(bookingRequests)
      .set({
        status: status,
        staffNotes: staff_notes || undefined,
        updatedAt: new Date()
      })
      .where(eq(bookingRequests.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Booking request not found' });
    }
    
    res.json(formatRow(result[0]));
  } catch (error: any) {
    console.error('Booking request update error:', error);
    res.status(500).json({ error: 'Failed to update booking request' });
  }
});

router.get('/api/approved-bookings', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const conditions: any[] = [eq(bookingRequests.status, 'approved')];
    
    if (start_date) {
      conditions.push(gte(bookingRequests.requestDate, start_date as string));
    }
    if (end_date) {
      conditions.push(lte(bookingRequests.requestDate, end_date as string));
    }
    
    const result = await db.select({
      id: bookingRequests.id,
      user_email: bookingRequests.userEmail,
      user_name: bookingRequests.userName,
      bay_id: bookingRequests.bayId,
      bay_preference: bookingRequests.bayPreference,
      request_date: bookingRequests.requestDate,
      start_time: bookingRequests.startTime,
      duration_minutes: bookingRequests.durationMinutes,
      end_time: bookingRequests.endTime,
      notes: bookingRequests.notes,
      status: bookingRequests.status,
      staff_notes: bookingRequests.staffNotes,
      suggested_time: bookingRequests.suggestedTime,
      reviewed_by: bookingRequests.reviewedBy,
      reviewed_at: bookingRequests.reviewedAt,
      created_at: bookingRequests.createdAt,
      updated_at: bookingRequests.updatedAt,
      calendar_event_id: bookingRequests.calendarEventId,
      bay_name: bays.name
    })
    .from(bookingRequests)
    .leftJoin(bays, eq(bookingRequests.bayId, bays.id))
    .where(and(...conditions))
    .orderBy(asc(bookingRequests.requestDate), asc(bookingRequests.startTime));
    
    res.json(result);
  } catch (error: any) {
    console.error('Approved bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch approved bookings' });
  }
});

export default router;
