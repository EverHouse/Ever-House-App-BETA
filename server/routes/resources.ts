import { Router } from 'express';
import { eq, and, or, sql, desc, asc, ne } from 'drizzle-orm';
import { db } from '../db';
import { bookings, resources, users, facilityClosures, bays, notifications, bookingRequests } from '../../shared/schema';
import { isAuthorizedForMemberBooking } from '../core/trackman';
import { isStaffOrAdmin } from '../core/middleware';
import { createCalendarEventOnCalendar, getCalendarIdByName, deleteCalendarEvent, CALENDAR_CONFIG } from '../core/calendar';
import { logAndRespond, logger } from '../core/logger';
import { sendPushNotification } from './push';
import { DEFAULT_TIER } from '../../shared/constants/tiers';
import { withRetry } from '../core/retry';
import { checkDailyBookingLimit } from '../core/tierService';

const router = Router();

router.get('/api/resources', async (req, res) => {
  try {
    const result = await withRetry(() =>
      db.select()
        .from(resources)
        .orderBy(asc(resources.type), asc(resources.name))
    );
    res.json(result);
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to fetch resources', error, 'RESOURCES_FETCH_ERROR');
  }
});

router.get('/api/bookings/check-existing', isStaffOrAdmin, async (req, res) => {
  try {
    const { member_email, date, resource_type } = req.query;
    
    if (!member_email || !date || !resource_type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const existingBookings = await db.select({
      id: bookings.id,
      resourceType: resources.type
    })
      .from(bookings)
      .innerJoin(resources, eq(bookings.resourceId, resources.id))
      .where(and(
        eq(bookings.userEmail, (member_email as string).toLowerCase()),
        sql`${bookings.bookingDate} = ${date}`,
        eq(resources.type, resource_type as string),
        or(
          eq(bookings.status, 'confirmed'),
          eq(bookings.status, 'pending'),
          eq(bookings.status, 'pending_approval'),
          eq(bookings.status, 'approved')
        )
      ));
    
    res.json({ 
      hasExisting: existingBookings.length > 0,
      count: existingBookings.length
    });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to check existing bookings', error, 'CHECK_EXISTING_ERROR');
  }
});

router.get('/api/bookings', async (req, res) => {
  try {
    const sessionUser = (req.session as any)?.user;
    
    if (!sessionUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { user_email: rawEmail, date, resource_id, status } = req.query;
    
    const user_email = rawEmail ? decodeURIComponent(rawEmail as string) : null;
    const sessionEmail = sessionUser.email?.toLowerCase() || '';
    
    if (user_email && user_email.toLowerCase() !== sessionEmail) {
      const { isAdminEmail, getAuthPool, queryWithRetry } = await import('../replit_integrations/auth/replitAuth');
      const isAdmin = await isAdminEmail(sessionEmail);
      if (!isAdmin) {
        const pool = getAuthPool();
        let isStaff = false;
        if (pool) {
          try {
            const result = await queryWithRetry(
              pool,
              'SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
              [sessionEmail]
            );
            isStaff = result.rows.length > 0;
          } catch (e) {}
        }
        if (!isStaff) {
          return res.status(403).json({ error: 'You can only view your own bookings' });
        }
      }
    }
    
    const conditions = [
      eq(bookings.status, (status as string) || 'confirmed')
    ];
    
    if (user_email) {
      conditions.push(eq(bookings.userEmail, user_email.toLowerCase()));
    }
    if (date) {
      conditions.push(sql`${bookings.bookingDate} = ${date}`);
    }
    if (resource_id) {
      conditions.push(eq(bookings.resourceId, parseInt(resource_id as string)));
    }
    
    const result = await withRetry(() =>
      db.select({
        id: bookings.id,
        resource_id: bookings.resourceId,
        user_email: bookings.userEmail,
        booking_date: bookings.bookingDate,
        start_time: bookings.startTime,
        end_time: bookings.endTime,
        status: bookings.status,
        notes: bookings.notes,
        created_at: bookings.createdAt,
        resource_name: resources.name,
        resource_type: resources.type
      })
        .from(bookings)
        .innerJoin(resources, eq(bookings.resourceId, resources.id))
        .where(and(...conditions))
        .orderBy(asc(bookings.bookingDate), asc(bookings.startTime))
    );
    
    res.json(result);
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to fetch bookings', error, 'BOOKINGS_FETCH_ERROR');
  }
});

router.get('/api/pending-bookings', isStaffOrAdmin, async (req, res) => {
  try {
    const result = await withRetry(() =>
      db.select({
        id: bookings.id,
        resource_id: bookings.resourceId,
        user_email: bookings.userEmail,
        booking_date: bookings.bookingDate,
        start_time: bookings.startTime,
        end_time: bookings.endTime,
        status: bookings.status,
        notes: bookings.notes,
        created_at: bookings.createdAt,
        resource_name: resources.name,
        resource_type: resources.type,
        first_name: users.firstName,
        last_name: users.lastName,
      })
        .from(bookings)
        .innerJoin(resources, eq(bookings.resourceId, resources.id))
        .leftJoin(users, eq(bookings.userEmail, users.email))
        .where(eq(bookings.status, 'pending_approval'))
        .orderBy(desc(bookings.createdAt))
    );
    res.json(result);
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to fetch pending bookings', error, 'PENDING_BOOKINGS_ERROR');
  }
});

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
    if (!isNaN(bayId)) return [bayId];
  }
  
  if (affectedAreas.includes(',') && !affectedAreas.startsWith('[')) {
    const ids: number[] = [];
    for (const item of affectedAreas.split(',')) {
      const trimmed = item.trim();
      if (trimmed.startsWith('bay_')) {
        const bayId = parseInt(trimmed.replace('bay_', ''));
        if (!isNaN(bayId)) ids.push(bayId);
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
          } else {
            const bayId = parseInt(item);
            if (!isNaN(bayId)) ids.push(bayId);
          }
        }
      }
      return ids;
    }
  } catch (parseError) {
    console.warn('[getAffectedBayIds] Failed to parse JSON affectedAreas:', affectedAreas, parseError);
  }
  
  return [];
}

function parseTimeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

async function checkClosureConflict(resourceId: number, bookingDate: string, startTime: string, endTime: string): Promise<{ hasConflict: boolean; closureTitle?: string }> {
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
    const affectedBayIds = await getAffectedBayIds(closure.affectedAreas);
    
    if (!affectedBayIds.includes(resourceId)) continue;
    
    if (!closure.startTime && !closure.endTime) {
      return { hasConflict: true, closureTitle: closure.title || 'Facility Closure' };
    }
    
    const closureStartMinutes = closure.startTime ? parseTimeToMinutes(closure.startTime) : 0;
    const closureEndMinutes = closure.endTime ? parseTimeToMinutes(closure.endTime) : 24 * 60;
    
    if (bookingStartMinutes < closureEndMinutes && bookingEndMinutes > closureStartMinutes) {
      return { hasConflict: true, closureTitle: closure.title || 'Facility Closure' };
    }
  }
  
  return { hasConflict: false };
}

async function checkBookingConflict(resourceId: number, bookingDate: string, startTime: string, endTime: string, excludeBookingId?: number): Promise<{ hasConflict: boolean; conflictingBooking?: any }> {
  const conditions = [
    eq(bookings.resourceId, resourceId),
    sql`${bookings.bookingDate} = ${bookingDate}`,
    eq(bookings.status, 'confirmed'),
    or(
      and(
        sql`${bookings.startTime} < ${endTime}`,
        sql`${bookings.endTime} > ${startTime}`
      )
    )
  ];
  
  const existingBookings = await db
    .select()
    .from(bookings)
    .where(and(...conditions));
  
  const conflicts = excludeBookingId 
    ? existingBookings.filter(b => b.id !== excludeBookingId)
    : existingBookings;
  
  if (conflicts.length > 0) {
    return { hasConflict: true, conflictingBooking: conflicts[0] };
  }
  
  return { hasConflict: false };
}

router.put('/api/bookings/:id/approve', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);
    
    const result = await db.transaction(async (tx) => {
      const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
      
      if (!booking) {
        throw { statusCode: 404, error: 'Booking not found' };
      }
      
      const closureCheck = await checkClosureConflict(
        booking.resourceId,
        booking.bookingDate,
        booking.startTime,
        booking.endTime
      );
      
      if (closureCheck.hasConflict) {
        throw { 
          statusCode: 409, 
          error: 'Cannot approve booking during closure',
          message: `This time slot conflicts with "${closureCheck.closureTitle}". Please decline this request or wait until the closure ends.`
        };
      }
      
      const existingConflicts = await tx.select()
        .from(bookings)
        .where(and(
          eq(bookings.resourceId, booking.resourceId),
          sql`${bookings.bookingDate} = ${booking.bookingDate}`,
          eq(bookings.status, 'confirmed'),
          ne(bookings.id, bookingId),
          or(
            and(
              sql`${bookings.startTime} < ${booking.endTime}`,
              sql`${bookings.endTime} > ${booking.startTime}`
            )
          )
        ));
      
      if (existingConflicts.length > 0) {
        throw { 
          statusCode: 409, 
          error: 'Time slot already booked',
          message: 'Another booking has already been approved for this time slot. Please decline this request or suggest an alternative time.'
        };
      }
      
      const [updated] = await tx.update(bookings)
        .set({ status: 'confirmed' })
        .where(eq(bookings.id, bookingId))
        .returning();
      
      return updated;
    });
    
    res.json(result);
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        error: error.error, 
        message: error.message 
      });
    }
    logAndRespond(req, res, 500, 'Failed to approve booking', error, 'APPROVE_BOOKING_ERROR');
  }
});

router.put('/api/bookings/:id/decline', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);
    
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
      
      if (!existing) {
        throw { statusCode: 404, error: 'Booking not found' };
      }
      
      const [updated] = await tx.update(bookings)
        .set({ status: 'declined' })
        .where(eq(bookings.id, bookingId))
        .returning();
      
      return updated;
    });
    
    res.json(result);
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.error });
    }
    logAndRespond(req, res, 500, 'Failed to decline booking', error, 'DECLINE_BOOKING_ERROR');
  }
});

router.post('/api/bookings', async (req, res) => {
  try {
    const sessionUser = (req.session as any)?.user;
    
    if (!sessionUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { resource_id, user_email, booking_date, start_time, end_time, notes } = req.body;
    
    if (!resource_id || !user_email || !booking_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields: resource_id, user_email, booking_date, start_time, end_time' });
    }
    
    const sessionEmail = sessionUser.email?.toLowerCase() || '';
    const requestEmail = user_email.toLowerCase();
    
    if (sessionEmail !== requestEmail) {
      const { isAdminEmail, getAuthPool, queryWithRetry } = await import('../replit_integrations/auth/replitAuth');
      const isAdmin = await isAdminEmail(sessionEmail);
      if (!isAdmin) {
        const pool = getAuthPool();
        let isStaff = false;
        if (pool) {
          try {
            const result = await queryWithRetry(
              pool,
              'SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
              [sessionEmail]
            );
            isStaff = result.rows.length > 0;
          } catch (e) {}
        }
        if (!isStaff) {
          return res.status(403).json({ error: 'You can only create bookings for yourself' });
        }
      }
    }
    
    const userResult = await db.select({
      id: users.id,
      tier: users.tier,
      tags: users.tags
    })
      .from(users)
      .where(eq(users.email, user_email));
    
    const user = userResult[0];
    const userTier = user?.tier || DEFAULT_TIER;
    let userTags: string[] = [];
    try {
      if (user?.tags) {
        userTags = typeof user.tags === 'string' ? JSON.parse(user.tags) : (Array.isArray(user.tags) ? user.tags : []);
      }
    } catch (parseError) {
      console.warn('[POST /api/bookings] Failed to parse user tags for', user_email, parseError);
      userTags = [];
    }
    
    const isMemberAuthorized = await isAuthorizedForMemberBooking(userTier, userTags);
    
    if (!isMemberAuthorized) {
      return res.status(402).json({ 
        error: 'Membership upgrade required',
        bookingType: 'upgrade_required',
        message: 'Simulator booking is available for Core, Premium, VIP, and Corporate members'
      });
    }
    
    // Calculate duration in minutes and check tier limits (daily minutes + booking window)
    const startParts = start_time.split(':').map(Number);
    const endParts = end_time.split(':').map(Number);
    const durationMinutes = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
    
    const limitCheck = await checkDailyBookingLimit(user_email, booking_date, durationMinutes, userTier);
    if (!limitCheck.allowed) {
      return res.status(403).json({ 
        error: limitCheck.reason,
        remainingMinutes: limitCheck.remainingMinutes
      });
    }
    
    const existingResult = await db.select()
      .from(bookings)
      .where(and(
        eq(bookings.resourceId, resource_id),
        sql`${bookings.bookingDate} = ${booking_date}`,
        or(
          eq(bookings.status, 'confirmed'),
          eq(bookings.status, 'pending_approval')
        ),
        or(
          and(
            sql`${bookings.startTime} <= ${start_time}`,
            sql`${bookings.endTime} > ${start_time}`
          ),
          and(
            sql`${bookings.startTime} < ${end_time}`,
            sql`${bookings.endTime} >= ${end_time}`
          ),
          and(
            sql`${bookings.startTime} >= ${start_time}`,
            sql`${bookings.endTime} <= ${end_time}`
          )
        )
      ));
    
    if (existingResult.length > 0) {
      return res.status(409).json({ error: 'This time slot is already requested or booked' });
    }
    
    // Check for facility closure conflicts
    const closureCheck = await checkClosureConflict(resource_id, booking_date, start_time, end_time);
    if (closureCheck.hasConflict) {
      return res.status(409).json({ 
        error: 'Time slot conflicts with a facility closure',
        message: `This time slot conflicts with "${closureCheck.closureTitle}".`
      });
    }
    
    const result = await db.insert(bookings)
      .values({
        resourceId: resource_id,
        userEmail: user_email.toLowerCase(),
        bookingDate: booking_date,
        startTime: start_time,
        endTime: end_time,
        notes: notes || null,
        status: 'pending_approval'
      })
      .returning();
    
    res.status(201).json({
      ...result[0],
      message: 'Request sent! Concierge will confirm shortly.'
    });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to submit booking request', error, 'BOOKING_REQUEST_ERROR');
  }
});

router.delete('/api/bookings/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [booking] = await db.select({
      calendarEventId: bookings.calendarEventId,
      resourceId: bookings.resourceId
    })
    .from(bookings)
    .where(eq(bookings.id, parseInt(id)));
    
    await db.update(bookings)
      .set({ status: 'cancelled' })
      .where(eq(bookings.id, parseInt(id)));
    
    if (booking?.calendarEventId) {
      try {
        const resource = await db.select({ type: resources.type })
          .from(resources)
          .where(eq(resources.id, booking.resourceId));
        
        const calendarName = resource[0]?.type === 'conference_room' 
          ? CALENDAR_CONFIG.conference.name 
          : CALENDAR_CONFIG.golf.name;
        
        const calendarId = await getCalendarIdByName(calendarName);
        if (calendarId) {
          await deleteCalendarEvent(booking.calendarEventId, calendarId);
        }
      } catch (calError) {
        console.error('Failed to delete calendar event (non-blocking):', calError);
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to cancel booking', error, 'BOOKING_CANCEL_ERROR');
  }
});

router.put('/api/bookings/:id/member-cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const rawSessionEmail = (req.session as any)?.user?.email;
    const sessionUserRole = (req.session as any)?.user?.role;
    const userEmail = rawSessionEmail?.toLowerCase();
    
    // Check for admin "View As" mode - get the impersonated user's email from request body
    const actingAsEmail = req.body?.acting_as_email?.toLowerCase();
    const isAdminViewingAs = (sessionUserRole === 'admin' || sessionUserRole === 'staff') && actingAsEmail;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const bookingId = parseInt(id);
    
    const [existing] = await db.select({
      id: bookings.id,
      userEmail: bookings.userEmail,
      status: bookings.status,
      calendarEventId: bookings.calendarEventId,
      resourceId: bookings.resourceId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime
    })
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    
    if (!existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingEmail = existing.userEmail?.toLowerCase();
    
    // Allow cancel if: (1) session user owns the booking, OR (2) admin/staff is viewing as the booking owner
    const isOwnBooking = bookingEmail === userEmail;
    const isValidViewAs = isAdminViewingAs && bookingEmail === actingAsEmail;
    
    if (!isOwnBooking && !isValidViewAs) {
      logger.warn('Member cancel email mismatch', { 
        bookingId, 
        bookingEmail: existing.userEmail, 
        sessionEmail: rawSessionEmail,
        actingAsEmail: actingAsEmail || 'none',
        normalizedBookingEmail: bookingEmail,
        normalizedSessionEmail: userEmail,
        requestId: req.requestId 
      });
      return res.status(403).json({ error: 'You can only cancel your own bookings' });
    }
    
    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }
    
    await db.update(bookings)
      .set({ status: 'cancelled' })
      .where(eq(bookings.id, bookingId));
    
    if (existing.calendarEventId) {
      try {
        const resource = await db.select({ type: resources.type })
          .from(resources)
          .where(eq(resources.id, existing.resourceId));
        
        const calendarName = resource[0]?.type === 'conference_room' 
          ? CALENDAR_CONFIG.conference.name 
          : CALENDAR_CONFIG.golf.name;
        
        const calendarId = await getCalendarIdByName(calendarName);
        if (calendarId) {
          await deleteCalendarEvent(existing.calendarEventId, calendarId);
        }
      } catch (calError) {
        console.error('Failed to delete calendar event (non-blocking):', calError);
      }
    }
    
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to cancel booking', error, 'BOOKING_CANCEL_ERROR');
  }
});

router.post('/api/bookings/:id/checkin', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.update(bookings)
      .set({ status: 'checked_in' })
      .where(eq(bookings.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ success: true, booking: result[0] });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to check in', error, 'CHECKIN_ERROR');
  }
});

router.post('/api/staff/bookings/manual', isStaffOrAdmin, async (req, res) => {
  try {
    const { 
      member_email, 
      resource_id, 
      booking_date, 
      start_time, 
      duration_minutes, 
      guest_count = 0, 
      booking_source, 
      notes,
      staff_notes,
      reschedule_from_id
    } = req.body;

    // Get staff email from authenticated session (more secure than trusting client input)
    const staffEmail = (req.session as any)?.user?.email;
    if (!staffEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!member_email || !resource_id || !booking_date || !start_time || !duration_minutes || !booking_source) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validSources = ['Trackman', 'YGB', 'Mindbody', 'Texted Concierge', 'Called', 'Other'];
    if (!validSources.includes(booking_source)) {
      return res.status(400).json({ error: 'Invalid booking source' });
    }

    // Staff manual bookings support extended durations for imports and private events
    const validDurations = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300];
    if (!validDurations.includes(duration_minutes)) {
      return res.status(400).json({ error: 'Invalid duration. Must be between 30 and 300 minutes in 30-minute increments.' });
    }

    const [member] = await db.select()
      .from(users)
      .where(eq(users.email, member_email));

    if (!member) {
      return res.status(404).json({ error: 'Member not found with that email' });
    }

    const [resource] = await db.select()
      .from(resources)
      .where(eq(resources.id, resource_id));

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Staff manual bookings bypass tier duration limits
    // This allows staff to create extended bookings for private events, imports, etc.

    // If rescheduling, fetch old booking info but don't cancel yet (cancel only after new booking succeeds)
    let oldBookingRequest: typeof bookingRequests.$inferSelect | null = null;
    if (reschedule_from_id) {
      const [found] = await db.select()
        .from(bookingRequests)
        .where(eq(bookingRequests.id, reschedule_from_id));
      oldBookingRequest = found || null;
    }

    // Check for existing booking of same resource type on same day (skip if rescheduling)
    if (!reschedule_from_id) {
      const existingBookings = await db.select({
        id: bookings.id,
        resourceType: resources.type
      })
        .from(bookings)
        .innerJoin(resources, eq(bookings.resourceId, resources.id))
        .where(and(
          eq(bookings.userEmail, member_email.toLowerCase()),
          sql`${bookings.bookingDate} = ${booking_date}`,
          eq(resources.type, resource.type),
          or(
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'pending_approval'),
            eq(bookings.status, 'approved')
          )
        ));
      
      if (existingBookings.length > 0) {
        const resourceTypeLabel = resource.type === 'conference_room' ? 'conference room' : 'bay';
        return res.status(409).json({ 
          error: 'Member already has a booking',
          message: `This member already has a ${resourceTypeLabel} booking on ${booking_date}. Only one ${resourceTypeLabel} booking per day is allowed.`
        });
      }
    }

    const startParts = start_time.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + (startParts[1] || 0);
    const endMinutes = startMinutes + duration_minutes;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const end_time = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    const closureCheck = await checkClosureConflict(resource_id, booking_date, start_time, end_time);
    if (closureCheck.hasConflict) {
      return res.status(409).json({ 
        error: 'Time slot conflicts with a facility closure',
        message: `This time slot conflicts with "${closureCheck.closureTitle}".`
      });
    }

    const bookingCheck = await checkBookingConflict(resource_id, booking_date, start_time, end_time);
    if (bookingCheck.hasConflict) {
      return res.status(409).json({ 
        error: 'Time slot already booked',
        message: 'Another booking already exists for this time slot.'
      });
    }

    let calendarEventId: string | null = null;
    try {
      const calendarName = resource.type === 'simulator' 
        ? CALENDAR_CONFIG.golf.name 
        : CALENDAR_CONFIG.conference.name;
      
      const calendarId = await getCalendarIdByName(calendarName);
      
      if (calendarId) {
        const memberName = member.firstName && member.lastName 
          ? `${member.firstName} ${member.lastName}` 
          : member_email;
        
        const summary = `Booking: ${memberName}`;
        const descriptionLines = [
          `Area: ${resource.name}`,
          `Member: ${member_email}`,
          `Guests: ${guest_count}`,
          `Source: ${booking_source}`,
          `Created by: ${staffEmail}`
        ];
        if (notes) {
          descriptionLines.push(`Notes: ${notes}`);
        }
        const description = descriptionLines.join('\n');
        
        calendarEventId = await createCalendarEventOnCalendar(
          calendarId,
          summary,
          description,
          booking_date,
          start_time,
          end_time
        );
      }
    } catch (calErr) {
      logger.error('Calendar event creation error', { error: calErr as Error, requestId: req.requestId });
    }

    const [newBooking] = await db.insert(bookings)
      .values({
        resourceId: resource_id,
        userEmail: member_email,
        bookingDate: booking_date,
        startTime: start_time,
        endTime: end_time,
        status: 'confirmed',
        notes: notes || null,
        bookingSource: booking_source,
        guestCount: guest_count,
        createdByStaffId: staffEmail,
        calendarEventId: calendarEventId
      })
      .returning();

    // Also insert into booking_requests for admin calendar visibility
    const memberName = member.firstName && member.lastName 
      ? `${member.firstName} ${member.lastName}` 
      : member_email;
    
    await db.insert(bookingRequests)
      .values({
        userEmail: member_email,
        userName: memberName,
        bayId: resource_id,
        bayPreference: resource.name,
        requestDate: booking_date,
        startTime: start_time,
        durationMinutes: duration_minutes,
        endTime: end_time,
        notes: notes || null,
        staffNotes: staff_notes || null,
        status: 'approved',
        reviewedBy: staffEmail,
        reviewedAt: new Date(),
        calendarEventId: calendarEventId
      });

    // Now that new booking is created, cancel the old one if rescheduling
    if (oldBookingRequest) {
      // Cancel the old booking request
      await db.update(bookingRequests)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(bookingRequests.id, reschedule_from_id as number));
      
      // Also cancel the corresponding booking in bookings table
      await db.update(bookings)
        .set({ status: 'cancelled' })
        .where(and(
          eq(bookings.userEmail, oldBookingRequest.userEmail),
          sql`${bookings.bookingDate} = ${oldBookingRequest.requestDate}`,
          eq(bookings.startTime, oldBookingRequest.startTime),
          or(
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'approved')
          )
        ));
      
      // Delete old calendar event
      if (oldBookingRequest.calendarEventId) {
        try {
          const calendarName = CALENDAR_CONFIG.golf.name;
          const oldCalendarId = await getCalendarIdByName(calendarName);
          if (oldCalendarId) {
            await deleteCalendarEvent(oldBookingRequest.calendarEventId, oldCalendarId);
          }
        } catch (calErr) {
          logger.warn('Failed to delete old calendar event during reschedule', { error: calErr as Error, requestId: req.requestId });
        }
      }
      
      logger.info('Rescheduled booking - cancelled old, created new', { 
        oldBookingId: reschedule_from_id, 
        newBookingId: newBooking.id,
        memberEmail: member_email,
        requestId: req.requestId 
      });
    }

    await db.update(users)
      .set({ 
        lifetimeVisits: sql`COALESCE(${users.lifetimeVisits}, 0) + 1`
      })
      .where(eq(users.email, member_email));

    // Notify member about their new booking
    try {
      const formattedDate = new Date(booking_date + 'T00:00:00').toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric' 
      });
      const formatTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
      };
      const notifTitle = 'Booking Confirmed';
      const notifMessage = `Your ${resource.type === 'simulator' ? 'golf simulator' : 'conference room'} booking for ${formattedDate} at ${formatTime(start_time)} has been confirmed.`;
      
      await db.insert(notifications).values({
        userEmail: member_email,
        title: notifTitle,
        message: notifMessage,
        type: 'booking_approved',
        relatedId: newBooking.id,
        relatedType: 'booking'
      });
      
      await sendPushNotification(member_email, {
        title: notifTitle,
        body: notifMessage,
        url: '/dashboard'
      });
    } catch (notifErr) {
      logger.error('Failed to send manual booking notification', { error: notifErr as Error, requestId: req.requestId });
    }

    res.status(201).json({
      success: true,
      booking: {
        ...newBooking,
        resource_name: resource.name,
        resource_type: resource.type,
        member_name: member.firstName && member.lastName 
          ? `${member.firstName} ${member.lastName}` 
          : null
      },
      message: 'Booking created successfully'
    });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to create manual booking', error, 'MANUAL_BOOKING_ERROR');
  }
});

export default router;
