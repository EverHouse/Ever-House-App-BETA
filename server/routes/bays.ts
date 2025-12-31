import { Router } from 'express';
import { db } from '../db';
import { bays, availabilityBlocks, bookingRequests, notifications, facilityClosures } from '../../shared/schema';
import { eq, and, or, gte, lte, gt, lt, desc, asc, ne, sql } from 'drizzle-orm';
import { isProduction } from '../core/db';
import { getGoogleCalendarClient } from '../core/integrations';
import { CALENDAR_CONFIG, getCalendarIdByName, createCalendarEvent, createCalendarEventOnCalendar, deleteCalendarEvent, getConferenceRoomBookingsFromCalendar } from '../core/calendar';
import { sendPushNotification, sendPushNotificationToStaff } from './push';
import { checkDailyBookingLimit } from '../core/tierService';
import { notifyAllStaff } from '../core/staffNotifications';
import { isStaffOrAdmin } from '../core/middleware';
import { formatNotificationDateTime, formatDateDisplayWithDay, formatTime12Hour, createPacificDate } from '../utils/dateUtils';

const router = Router();

// Conference room bay ID constant
const CONFERENCE_ROOM_BAY_ID = 11;

// Helper to get the correct calendar name based on bay ID
// Uses DB lookup for bay name to check if it's a conference room
async function getCalendarNameForBayAsync(bayId: number | null): Promise<string> {
  if (!bayId) return CALENDAR_CONFIG.golf.name;
  
  try {
    const result = await db.select({ name: bays.name }).from(bays).where(eq(bays.id, bayId));
    const bayName = result[0]?.name?.toLowerCase() || '';
    if (bayName.includes('conference')) {
      return CALENDAR_CONFIG.conference.name;
    }
  } catch (e) {
    // Fallback to ID check if DB lookup fails
  }
  
  // Fallback: check by known conference room ID
  return bayId === CONFERENCE_ROOM_BAY_ID 
    ? CALENDAR_CONFIG.conference.name 
    : CALENDAR_CONFIG.golf.name;
}

// Sync version for simple cases (uses ID check only)
function getCalendarNameForBay(bayId: number | null): string {
  return bayId === CONFERENCE_ROOM_BAY_ID 
    ? CALENDAR_CONFIG.conference.name 
    : CALENDAR_CONFIG.golf.name;
}

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
  } catch (parseError) {
    console.warn('[getAffectedBayIdsFromClosure] Failed to parse JSON affectedAreas:', affectedAreas, parseError);
  }
  
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

async function isStaffOrAdminCheck(email: string): Promise<boolean> {
  const { isAdminEmail, getAuthPool, queryWithRetry } = await import('../replit_integrations/auth/replitAuth');
  const isAdmin = await isAdminEmail(email);
  if (isAdmin) return true;
  
  const pool = getAuthPool();
  if (!pool) return false;
  
  try {
    const result = await queryWithRetry(
      pool,
      'SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking staff status:', error);
    return false;
  }
}

router.get('/api/booking-requests', async (req, res) => {
  try {
    const { user_email, status, include_all } = req.query;
    const sessionUser = (req.session as any)?.user;
    
    if (!sessionUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const sessionEmail = sessionUser.email?.toLowerCase() || '';
    const requestedEmail = (user_email as string)?.toLowerCase();
    
    if (include_all === 'true') {
      const hasStaffAccess = await isStaffOrAdminCheck(sessionEmail);
      if (!hasStaffAccess) {
        return res.status(403).json({ error: 'Staff access required to view all requests' });
      }
    } else if (user_email) {
      if (requestedEmail !== sessionEmail) {
        const hasStaffAccess = await isStaffOrAdminCheck(sessionEmail);
        if (!hasStaffAccess) {
          return res.status(403).json({ error: 'You can only view your own booking requests' });
        }
      }
    } else {
      return res.status(400).json({ error: 'user_email or include_all parameter required' });
    }
    
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
      reschedule_booking_id: bookingRequests.rescheduleBookingId,
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
    const sessionUser = (req.session as any)?.user;
    
    if (!sessionUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { user_email, user_name, bay_id, bay_preference, request_date, start_time, duration_minutes, notes, user_tier, reschedule_booking_id } = req.body;
    
    if (!user_email || !request_date || !start_time || !duration_minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const sessionEmail = sessionUser.email?.toLowerCase() || '';
    const requestEmail = user_email.toLowerCase();
    
    if (sessionEmail !== requestEmail) {
      const hasStaffAccess = await isStaffOrAdminCheck(sessionEmail);
      if (!hasStaffAccess) {
        return res.status(403).json({ error: 'You can only create booking requests for yourself' });
      }
    }
    
    if (typeof duration_minutes !== 'number' || duration_minutes <= 0 || duration_minutes > 480) {
      return res.status(400).json({ error: 'Invalid duration. Must be between 1 and 480 minutes.' });
    }
    
    let originalBooking: any = null;
    
    if (reschedule_booking_id) {
      const [origBooking] = await db.select()
        .from(bookingRequests)
        .where(eq(bookingRequests.id, reschedule_booking_id));
      
      if (!origBooking) {
        return res.status(400).json({ error: 'Original booking not found' });
      }
      
      if (origBooking.userEmail.toLowerCase() !== requestEmail) {
        return res.status(400).json({ error: 'Original booking does not belong to you' });
      }
      
      // Only allow rescheduling of approved/confirmed bookings (not attended, declined, cancelled, no_show)
      const validStatuses = ['approved', 'confirmed', 'pending_approval'];
      if (!validStatuses.includes(origBooking.status || '')) {
        return res.status(400).json({ error: 'Original booking cannot be rescheduled (already cancelled, declined, attended, or no-show)' });
      }
      
      // Build Pacific datetime from booking date and start time using proper timezone utilities
      const bookingDateStr = origBooking.requestDate; // YYYY-MM-DD
      const bookingTimeStr = origBooking.startTime?.substring(0, 5) || '00:00'; // HH:MM
      
      // createPacificDate properly handles Pacific timezone and DST
      const bookingDateTime = createPacificDate(bookingDateStr, bookingTimeStr);
      const now = new Date();
      
      // Check if booking has already started or passed
      if (bookingDateTime.getTime() <= now.getTime()) {
        return res.status(400).json({ error: 'Cannot reschedule a booking that has already started or passed' });
      }
      
      // Server-side 30-minute cutoff enforcement
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      if (bookingDateTime.getTime() <= thirtyMinutesFromNow.getTime()) {
        return res.status(400).json({ error: 'Cannot reschedule a booking within 30 minutes of its start time' });
      }
      
      // Prevent multiple reschedule requests regardless of status (not just pending)
      // Check for any non-declined, non-cancelled reschedule request
      const existingReschedule = await db.select({ id: bookingRequests.id, status: bookingRequests.status })
        .from(bookingRequests)
        .where(and(
          eq(bookingRequests.rescheduleBookingId, reschedule_booking_id),
          ne(bookingRequests.status, 'declined'),
          ne(bookingRequests.status, 'cancelled')
        ));
      
      if (existingReschedule.length > 0) {
        return res.status(400).json({ error: 'A reschedule request already exists for this booking' });
      }
      
      originalBooking = origBooking;
    }
    
    if (!reschedule_booking_id) {
      const limitCheck = await checkDailyBookingLimit(user_email, request_date, duration_minutes, user_tier);
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          error: limitCheck.reason,
          remainingMinutes: limitCheck.remainingMinutes
        });
      }
    }
    
    const [hours, mins] = start_time.split(':').map(Number);
    const totalMins = hours * 60 + mins + duration_minutes;
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;
    const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
    
    const result = await db.insert(bookingRequests).values({
      userEmail: user_email.toLowerCase(),
      userName: user_name,
      bayId: bay_id || null,
      bayPreference: bay_preference,
      requestDate: request_date,
      startTime: start_time,
      durationMinutes: duration_minutes,
      endTime: end_time,
      notes: notes,
      rescheduleBookingId: reschedule_booking_id || null
    }).returning();
    
    const row = result[0];
    
    // Send notifications in background - don't block the response
    const formattedDate = new Date(row.requestDate).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    const formattedTime = row.startTime?.substring(0, 5) || start_time.substring(0, 5);
    
    let staffMessage: string;
    let staffTitle: string;
    
    if (originalBooking) {
      const origFormattedDate = new Date(originalBooking.requestDate).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const origFormattedTime = originalBooking.startTime?.substring(0, 5) || '';
      staffTitle = 'Reschedule Request';
      staffMessage = `Reschedule request from ${row.userName || row.userEmail} - moving ${origFormattedDate} at ${origFormattedTime} to ${formattedDate} at ${formattedTime}`;
      
      db.insert(notifications).values({
        userEmail: row.userEmail,
        title: 'Reschedule Request Submitted',
        message: `Reschedule request submitted for ${formattedDate} at ${formattedTime}`,
        type: 'booking',
        relatedId: row.id,
        relatedType: 'booking_request'
      }).catch(err => console.error('Member notification failed:', err));
    } else {
      staffTitle = 'New Golf Booking Request';
      staffMessage = `${row.userName || row.userEmail} requested ${formattedDate} at ${formattedTime}`;
    }
    
    // In-app notification to all staff - don't fail booking if this fails
    notifyAllStaff(
      staffTitle,
      staffMessage,
      'booking',
      row.id,
      'booking_request'
    ).catch(err => console.error('Staff in-app notification failed:', err));
    
    // Push notification - already non-blocking
    sendPushNotificationToStaff({
      title: staffTitle,
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
      calendar_event_id: row.calendarEventId,
      reschedule_booking_id: row.rescheduleBookingId
    });
  } catch (error: any) {
    console.error('Booking request creation error:', error);
    res.status(500).json({ error: 'Failed to create booking request' });
  }
});

router.put('/api/booking-requests/:id', isStaffOrAdmin, async (req, res) => {
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
      calendar_event_id: row.calendarEventId,
      reschedule_booking_id: row.rescheduleBookingId
    });
    
    if (status === 'approved') {
      const bookingId = parseInt(id);
      
      const { updated, bayName, approvalMessage } = await db.transaction(async (tx) => {
        const [req_data] = await tx.select().from(bookingRequests).where(eq(bookingRequests.id, bookingId));
        
        if (!req_data) {
          throw { statusCode: 404, error: 'Request not found' };
        }
        
        const assignedBayId = bay_id || req_data.bayId;
        
        if (!assignedBayId) {
          throw { statusCode: 400, error: 'Bay must be assigned before approval' };
        }
        
        const conflicts = await tx.select().from(bookingRequests).where(and(
          eq(bookingRequests.bayId, assignedBayId),
          eq(bookingRequests.requestDate, req_data.requestDate),
          eq(bookingRequests.status, 'approved'),
          ne(bookingRequests.id, bookingId),
          or(
            and(lte(bookingRequests.startTime, req_data.startTime), gt(bookingRequests.endTime, req_data.startTime)),
            and(lt(bookingRequests.startTime, req_data.endTime), gte(bookingRequests.endTime, req_data.endTime)),
            and(gte(bookingRequests.startTime, req_data.startTime), lte(bookingRequests.endTime, req_data.endTime))
          )
        ));
        
        if (conflicts.length > 0) {
          throw { statusCode: 409, error: 'Time slot conflicts with existing booking' };
        }
        
        const closureCheck = await checkClosureConflict(
          assignedBayId,
          req_data.requestDate,
          req_data.startTime,
          req_data.endTime
        );
        
        if (closureCheck.hasConflict) {
          throw { 
            statusCode: 409, 
            error: 'Cannot approve booking during closure',
            message: `This time slot conflicts with "${closureCheck.closureTitle}". Please decline this request or wait until the closure ends.`
          };
        }
        
        const bayResult = await tx.select({ name: bays.name }).from(bays).where(eq(bays.id, assignedBayId));
        const bayName = bayResult[0]?.name || 'Simulator';
        
        let calendarEventId: string | null = null;
        try {
          const calendarName = await getCalendarNameForBayAsync(assignedBayId);
          const calendarId = await getCalendarIdByName(calendarName);
          if (calendarId) {
            const isConferenceRoom = bayName.toLowerCase().includes('conference');
            const summary = `Booking: ${req_data.userName || req_data.userEmail}`;
            const description = `Area: ${bayName}\nMember: ${req_data.userEmail}\nDuration: ${req_data.durationMinutes} minutes${req_data.notes ? '\nNotes: ' + req_data.notes : ''}`;
            calendarEventId = await createCalendarEventOnCalendar(
              calendarId,
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
        
        const [updatedRow] = await tx.update(bookingRequests)
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
          .where(eq(bookingRequests.id, bookingId))
          .returning();
        
        const isReschedule = !!updatedRow.rescheduleBookingId;
        const approvalMessage = isReschedule
          ? `Reschedule approved - your booking is now ${formatNotificationDateTime(updatedRow.requestDate, updatedRow.startTime)}`
          : `Your simulator booking for ${formatNotificationDateTime(updatedRow.requestDate, updatedRow.startTime)} has been approved.`;
        
        await tx.insert(notifications).values({
          userEmail: updatedRow.userEmail,
          title: isReschedule ? 'Reschedule Approved' : 'Booking Request Approved',
          message: approvalMessage,
          type: 'booking_approved',
          relatedId: updatedRow.id,
          relatedType: 'booking_request'
        });
        
        await tx.update(notifications)
          .set({ isRead: true })
          .where(and(
            eq(notifications.relatedId, bookingId),
            eq(notifications.relatedType, 'booking_request'),
            eq(notifications.type, 'booking')
          ));
        
        return { updated: updatedRow, bayName, approvalMessage };
      });
      
      if (updated.rescheduleBookingId) {
        try {
          const [originalBooking] = await db.select({
            id: bookingRequests.id,
            calendarEventId: bookingRequests.calendarEventId,
            bayId: bookingRequests.bayId
          })
            .from(bookingRequests)
            .where(eq(bookingRequests.id, updated.rescheduleBookingId));
          
          if (originalBooking) {
            await db.update(bookingRequests)
              .set({ status: 'cancelled', updatedAt: new Date() })
              .where(eq(bookingRequests.id, originalBooking.id));
            
            if (originalBooking.calendarEventId) {
              try {
                const calendarName = await getCalendarNameForBayAsync(originalBooking.bayId);
                const calendarId = await getCalendarIdByName(calendarName);
                await deleteCalendarEvent(originalBooking.calendarEventId, calendarId || 'primary');
              } catch (calError) {
                console.error('Failed to delete original booking calendar event (non-blocking):', calError);
              }
            }
          }
        } catch (rescheduleError) {
          console.error('Failed to cancel original booking during reschedule approval:', rescheduleError);
        }
      }
      
      sendPushNotification(updated.userEmail, {
        title: updated.rescheduleBookingId ? 'Reschedule Approved!' : 'Booking Approved!',
        body: approvalMessage,
        url: '/#/sims'
      }).catch(err => console.error('Push notification failed:', err));
      
      return res.json(formatRow(updated));
    }
    
    if (status === 'declined') {
      const bookingId = parseInt(id);
      
      const { updated, declineMessage, isReschedule } = await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(bookingRequests).where(eq(bookingRequests.id, bookingId));
        
        if (!existing) {
          throw { statusCode: 404, error: 'Booking request not found' };
        }
        
        const [updatedRow] = await tx.update(bookingRequests)
          .set({
            status: status,
            staffNotes: staff_notes,
            suggestedTime: suggested_time,
            reviewedBy: reviewed_by,
            reviewedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(bookingRequests.id, bookingId))
          .returning();
        
        const isReschedule = !!updatedRow.rescheduleBookingId;
        let declineMessage: string;
        let notificationTitle: string;
        
        if (isReschedule) {
          const [originalBooking] = await tx.select({
            requestDate: bookingRequests.requestDate,
            startTime: bookingRequests.startTime
          })
            .from(bookingRequests)
            .where(eq(bookingRequests.id, updatedRow.rescheduleBookingId!));
          
          if (originalBooking) {
            const origDateTime = formatNotificationDateTime(originalBooking.requestDate, originalBooking.startTime);
            declineMessage = `Reschedule declined - your original booking for ${origDateTime} remains active`;
          } else {
            declineMessage = `Reschedule declined - your original booking remains active`;
          }
          notificationTitle = 'Reschedule Declined';
        } else {
          declineMessage = suggested_time 
            ? `Your simulator booking request for ${formatDateDisplayWithDay(updatedRow.requestDate)} was declined. Suggested alternative: ${formatTime12Hour(suggested_time)}`
            : `Your simulator booking request for ${formatDateDisplayWithDay(updatedRow.requestDate)} was declined.`;
          notificationTitle = 'Booking Request Declined';
        }
        
        await tx.insert(notifications).values({
          userEmail: updatedRow.userEmail,
          title: notificationTitle,
          message: declineMessage,
          type: 'booking_declined',
          relatedId: updatedRow.id,
          relatedType: 'booking_request'
        });
        
        await tx.update(notifications)
          .set({ isRead: true })
          .where(and(
            eq(notifications.relatedId, bookingId),
            eq(notifications.relatedType, 'booking_request'),
            eq(notifications.type, 'booking')
          ));
        
        return { updated: updatedRow, declineMessage, isReschedule };
      });
      
      sendPushNotification(updated.userEmail, {
        title: isReschedule ? 'Reschedule Declined' : 'Booking Request Update',
        body: declineMessage,
        url: '/#/sims'
      }).catch(err => console.error('Push notification failed:', err));
      
      return res.json(formatRow(updated));
    }
    
    if (status === 'cancelled') {
      const bookingId = parseInt(id);
      const { cancelled_by } = req.body;
      
      const { updated, bookingData, pushInfo } = await db.transaction(async (tx) => {
        const [existing] = await tx.select({
          id: bookingRequests.id,
          calendarEventId: bookingRequests.calendarEventId,
          userEmail: bookingRequests.userEmail,
          userName: bookingRequests.userName,
          requestDate: bookingRequests.requestDate,
          startTime: bookingRequests.startTime,
          status: bookingRequests.status,
          bayId: bookingRequests.bayId
        })
          .from(bookingRequests)
          .where(eq(bookingRequests.id, bookingId));
        
        if (!existing) {
          throw { statusCode: 404, error: 'Booking request not found' };
        }
        
        const [updatedRow] = await tx.update(bookingRequests)
          .set({
            status: status,
            staffNotes: staff_notes || undefined,
            updatedAt: new Date()
          })
          .where(eq(bookingRequests.id, bookingId))
          .returning();
        
        let pushInfo: { type: 'staff' | 'member'; email?: string; message: string } | null = null;
        
        if (existing.status === 'approved') {
          const memberEmail = existing.userEmail;
          const memberName = existing.userName || memberEmail;
          const bookingDate = existing.requestDate;
          const bookingTime = existing.startTime?.substring(0, 5) || '';
          const memberCancelled = cancelled_by === memberEmail;
          
          const friendlyDateTime = formatNotificationDateTime(bookingDate, existing.startTime || '00:00');
          
          if (memberCancelled) {
            const staffMessage = `${memberName} has cancelled their booking for ${friendlyDateTime}.`;
            
            await tx.insert(notifications).values({
              userEmail: 'staff@evenhouse.app',
              title: 'Booking Cancelled by Member',
              message: staffMessage,
              type: 'booking_cancelled',
              relatedId: bookingId,
              relatedType: 'booking_request'
            });
            
            pushInfo = { type: 'staff', message: staffMessage };
          } else {
            const memberMessage = `Your booking for ${friendlyDateTime} has been cancelled by staff.`;
            
            await tx.insert(notifications).values({
              userEmail: memberEmail,
              title: 'Booking Cancelled',
              message: memberMessage,
              type: 'booking_cancelled',
              relatedId: bookingId,
              relatedType: 'booking_request'
            });
            
            pushInfo = { type: 'member', email: memberEmail, message: memberMessage };
          }
        }
        
        await tx.update(notifications)
          .set({ isRead: true })
          .where(and(
            eq(notifications.relatedId, bookingId),
            eq(notifications.relatedType, 'booking_request'),
            eq(notifications.type, 'booking')
          ));
        
        return { updated: updatedRow, bookingData: existing, pushInfo };
      });
      
      if (bookingData?.calendarEventId) {
        try {
          const calendarName = await getCalendarNameForBayAsync(bookingData.bayId);
          const calendarId = await getCalendarIdByName(calendarName);
          await deleteCalendarEvent(bookingData.calendarEventId, calendarId || 'primary');
        } catch (calError) {
          console.error('Failed to delete calendar event (non-blocking):', calError);
        }
      }
      
      if (pushInfo) {
        if (pushInfo.type === 'staff') {
          sendPushNotificationToStaff({
            title: 'Booking Cancelled',
            body: pushInfo.message,
            url: '/#/staff'
          }).catch(err => console.error('Staff push notification failed:', err));
        } else if (pushInfo.email) {
          sendPushNotification(pushInfo.email, {
            title: 'Booking Cancelled',
            body: pushInfo.message,
            url: '/#/sims'
          }).catch(err => console.error('Member push notification failed:', err));
        }
      }
      
      return res.json(formatRow(updated));
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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        error: error.error, 
        message: error.message 
      });
    }
    console.error('Booking request update error:', error);
    res.status(500).json({ error: 'Failed to update booking request' });
  }
});

router.put('/api/booking-requests/:id/member-cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const rawSessionEmail = (req.session as any)?.user?.email;
    const userEmail = rawSessionEmail?.toLowerCase();
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const bookingId = parseInt(id);
    
    const [existing] = await db.select({
      id: bookingRequests.id,
      userEmail: bookingRequests.userEmail,
      userName: bookingRequests.userName,
      requestDate: bookingRequests.requestDate,
      startTime: bookingRequests.startTime,
      status: bookingRequests.status,
      calendarEventId: bookingRequests.calendarEventId,
      bayId: bookingRequests.bayId
    })
      .from(bookingRequests)
      .where(eq(bookingRequests.id, bookingId));
    
    if (!existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingEmail = existing.userEmail?.toLowerCase();
    if (bookingEmail !== userEmail) {
      console.warn('[Member Cancel] Email mismatch:', { 
        bookingId, 
        bookingEmail: existing.userEmail, 
        sessionEmail: rawSessionEmail 
      });
      return res.status(403).json({ error: 'You can only cancel your own bookings' });
    }
    
    if (existing.status === 'cancelled' || existing.status === 'declined') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }
    
    const wasApproved = existing.status === 'approved';
    
    const [updated] = await db.update(bookingRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(bookingRequests.id, bookingId))
      .returning();
    
    if (wasApproved) {
      const memberName = existing.userName || existing.userEmail;
      const bookingDate = existing.requestDate;
      const bookingTime = existing.startTime?.substring(0, 5) || '';
      const staffMessage = `${memberName} has cancelled their booking for ${bookingDate} at ${bookingTime}.`;
      
      await db.insert(notifications).values({
        userEmail: 'staff@evenhouse.app',
        title: 'Booking Cancelled by Member',
        message: staffMessage,
        type: 'booking_cancelled',
        relatedId: bookingId,
        relatedType: 'booking_request'
      });
      
      sendPushNotificationToStaff({
        title: 'Booking Cancelled',
        body: staffMessage,
        url: '/#/staff'
      }).catch(err => console.error('Staff push notification failed:', err));
      
      if (existing.calendarEventId) {
        try {
          const calendarName = await getCalendarNameForBayAsync(existing.bayId);
          const calendarId = await getCalendarIdByName(calendarName);
          await deleteCalendarEvent(existing.calendarEventId, calendarId || 'primary');
        } catch (calError) {
          console.error('Failed to delete calendar event (non-blocking):', calError);
        }
      }
    }
    
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error: any) {
    console.error('Member booking cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

router.put('/api/bookings/:id/checkin', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status: targetStatus } = req.body;
    
    // Validate the target status - must be 'attended' or 'no_show'
    const validStatuses = ['attended', 'no_show'];
    const newStatus = validStatuses.includes(targetStatus) ? targetStatus : 'attended';
    
    // First check the current booking status
    const existing = await db.select({
      status: bookingRequests.status,
      userEmail: bookingRequests.userEmail
    })
      .from(bookingRequests)
      .where(eq(bookingRequests.id, parseInt(id)));
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const currentStatus = existing[0].status;
    
    // Idempotent - skip if already at target status
    if (currentStatus === newStatus) {
      return res.json({ success: true, message: `Already marked as ${newStatus}`, alreadyProcessed: true });
    }
    
    // Only allow status change from approved or confirmed
    if (currentStatus !== 'approved' && currentStatus !== 'confirmed') {
      return res.status(400).json({ error: `Cannot update booking with status: ${currentStatus}` });
    }
    
    // Update booking request status
    const result = await db.update(bookingRequests)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(and(
        eq(bookingRequests.id, parseInt(id)),
        or(
          eq(bookingRequests.status, 'approved'),
          eq(bookingRequests.status, 'confirmed')
        )
      ))
      .returning();
    
    if (result.length === 0) {
      return res.status(400).json({ error: 'Booking status changed before update' });
    }
    
    // Increment lifetime visits for the member only if marked as attended
    const booking = result[0];
    if (newStatus === 'attended' && booking.userEmail) {
      await db.execute(sql`
        UPDATE users 
        SET lifetime_visits = COALESCE(lifetime_visits, 0) + 1 
        WHERE email = ${booking.userEmail}
      `);
    }
    
    res.json({ success: true, booking: result[0] });
  } catch (error: any) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Get conference room bookings from Google Calendar (Mindbody bookings)
router.get('/api/conference-room-bookings', async (req, res) => {
  try {
    const { member_name, member_email } = req.query;
    const sessionUser = (req.session as any)?.user;
    
    if (!sessionUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // If no member name/email provided, use the session user's info
    const searchName = member_name as string || sessionUser.name || null;
    const searchEmail = member_email as string || sessionUser.email || null;
    
    const bookings = await getConferenceRoomBookingsFromCalendar(searchName, searchEmail);
    
    // Transform to match booking format expected by frontend
    const formattedBookings = bookings.map(booking => ({
      id: `cal_${booking.id}`,
      source: 'calendar',
      bay_id: CONFERENCE_ROOM_BAY_ID,
      bay_name: 'Conference Room',
      request_date: booking.date,
      start_time: booking.startTime + ':00',
      end_time: booking.endTime + ':00',
      user_name: booking.memberName,
      status: 'approved',
      notes: booking.description,
      calendar_event_id: booking.id
    }));
    
    res.json(formattedBookings);
  } catch (error: any) {
    console.error('Conference room bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch conference room bookings' });
  }
});

router.get('/api/approved-bookings', isStaffOrAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const conditions: any[] = [
      or(
        eq(bookingRequests.status, 'approved'),
        eq(bookingRequests.status, 'attended')
      )
    ];
    
    if (start_date) {
      conditions.push(gte(bookingRequests.requestDate, start_date as string));
    }
    if (end_date) {
      conditions.push(lte(bookingRequests.requestDate, end_date as string));
    }
    
    const dbResult = await db.select({
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
    
    // Also fetch conference room bookings from Google Calendar (Mindbody bookings)
    let calendarBookings: any[] = [];
    try {
      const calendarEvents = await getConferenceRoomBookingsFromCalendar();
      
      // Get calendar event IDs from DB results to avoid duplicates
      const dbCalendarEventIds = new Set(
        dbResult
          .filter(r => r.calendar_event_id)
          .map(r => r.calendar_event_id)
      );
      
      // Filter and format calendar bookings
      calendarBookings = calendarEvents
        .filter(event => {
          // Exclude events that already exist in DB
          if (dbCalendarEventIds.has(event.id)) return false;
          
          // Apply date filtering if specified
          if (start_date && event.date < (start_date as string)) return false;
          if (end_date && event.date > (end_date as string)) return false;
          
          return true;
        })
        .map(event => ({
          id: `cal_${event.id}`,
          user_email: null,
          user_name: event.memberName,
          bay_id: CONFERENCE_ROOM_BAY_ID,
          bay_preference: null,
          request_date: event.date,
          start_time: event.startTime + ':00',
          duration_minutes: null,
          end_time: event.endTime + ':00',
          notes: event.description,
          status: 'approved',
          staff_notes: null,
          suggested_time: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: null,
          updated_at: null,
          calendar_event_id: event.id,
          bay_name: 'Conference Room',
          source: 'calendar'
        }));
    } catch (calError) {
      console.error('Failed to fetch calendar conference bookings (non-blocking):', calError);
    }
    
    // Merge DB results with calendar bookings
    const allBookings = [...dbResult, ...calendarBookings]
      .sort((a, b) => {
        const dateCompare = (a.request_date || '').localeCompare(b.request_date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
    
    res.json(allBookings);
  } catch (error: any) {
    console.error('Approved bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch approved bookings' });
  }
});

export default router;
