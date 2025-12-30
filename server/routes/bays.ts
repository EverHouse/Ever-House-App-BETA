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
import { isStaffOrAdmin } from '../core/middleware';

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
      calendar_event_id: row.calendarEventId
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
          const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
          if (golfCalendarId) {
            const summary = `Booking: ${req_data.userName || req_data.userEmail}`;
            const description = `Area: ${bayName}\nMember: ${req_data.userEmail}\nDuration: ${req_data.durationMinutes} minutes${req_data.notes ? '\nNotes: ' + req_data.notes : ''}`;
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
        
        const approvalMessage = `Your simulator booking for ${updatedRow.requestDate} at ${updatedRow.startTime.substring(0, 5)} has been approved.`;
        
        await tx.insert(notifications).values({
          userEmail: updatedRow.userEmail,
          title: 'Booking Request Approved',
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
      
      sendPushNotification(updated.userEmail, {
        title: 'Booking Approved!',
        body: approvalMessage,
        url: '/#/sims'
      }).catch(err => console.error('Push notification failed:', err));
      
      return res.json(formatRow(updated));
    }
    
    if (status === 'declined') {
      const bookingId = parseInt(id);
      
      const { updated, declineMessage } = await db.transaction(async (tx) => {
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
        
        const declineMessage = suggested_time 
          ? `Your simulator booking request for ${updatedRow.requestDate} was declined. Suggested alternative: ${suggested_time.substring(0, 5)}`
          : `Your simulator booking request for ${updatedRow.requestDate} was declined.${staff_notes ? ' Note: ' + staff_notes : ''}`;
        
        await tx.insert(notifications).values({
          userEmail: updatedRow.userEmail,
          title: 'Booking Request Declined',
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
        
        return { updated: updatedRow, declineMessage };
      });
      
      sendPushNotification(updated.userEmail, {
        title: 'Booking Request Update',
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
          status: bookingRequests.status
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
          
          if (memberCancelled) {
            const staffMessage = `${memberName} has cancelled their booking for ${bookingDate} at ${bookingTime}.`;
            
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
            const memberMessage = `Your booking for ${bookingDate} at ${bookingTime} has been cancelled by staff.${staff_notes ? ' Note: ' + staff_notes : ''}`;
            
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
          const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
          await deleteCalendarEvent(bookingData.calendarEventId, golfCalendarId || 'primary');
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
