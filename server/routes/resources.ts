import { Router } from 'express';
import { eq, and, or, sql, desc, asc } from 'drizzle-orm';
import { db } from '../db';
import { bookings, resources, users, facilityClosures, bays } from '../../shared/schema';
import { isProduction } from '../core/db';
import { isAuthorizedForMemberBooking } from '../core/trackman';
import { isStaffOrAdmin } from '../core/middleware';

const router = Router();

router.get('/api/resources', async (req, res) => {
  try {
    const result = await db.select()
      .from(resources)
      .orderBy(asc(resources.type), asc(resources.name));
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

router.get('/api/bookings', async (req, res) => {
  try {
    const { user_email, date, resource_id, status } = req.query;
    
    const conditions = [
      eq(bookings.status, (status as string) || 'confirmed')
    ];
    
    if (user_email) {
      conditions.push(eq(bookings.userEmail, user_email as string));
    }
    if (date) {
      conditions.push(sql`${bookings.bookingDate} = ${date}`);
    }
    if (resource_id) {
      conditions.push(eq(bookings.resourceId, parseInt(resource_id as string)));
    }
    
    const result = await db.select({
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
      .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
    
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.get('/api/pending-bookings', async (req, res) => {
  try {
    const result = await db
      .select({
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
      .orderBy(desc(bookings.createdAt));
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Pending bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch pending bookings' });
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
  } catch {}
  
  return [];
}

function parseTimeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

async function checkClosureConflict(resourceId: number, bookingDate: string, startTime: string, endTime: string): Promise<{ hasConflict: boolean; closureTitle?: string }> {
  const resource = await db.select({ type: resources.type }).from(resources).where(eq(resources.id, resourceId));
  if (!resource[0] || resource[0].type !== 'simulator') {
    return { hasConflict: false };
  }
  
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

router.put('/api/bookings/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);
    
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const closureCheck = await checkClosureConflict(
      booking.resourceId,
      booking.bookingDate,
      booking.startTime,
      booking.endTime
    );
    
    if (closureCheck.hasConflict) {
      return res.status(409).json({ 
        error: 'Cannot approve booking during closure',
        message: `This time slot conflicts with "${closureCheck.closureTitle}". Please decline this request or wait until the closure ends.`
      });
    }
    
    const bookingCheck = await checkBookingConflict(
      booking.resourceId,
      booking.bookingDate,
      booking.startTime,
      booking.endTime,
      bookingId
    );
    
    if (bookingCheck.hasConflict) {
      return res.status(409).json({ 
        error: 'Time slot already booked',
        message: 'Another booking has already been approved for this time slot. Please decline this request or suggest an alternative time.'
      });
    }
    
    const result = await db.update(bookings)
      .set({ status: 'confirmed' })
      .where(eq(bookings.id, bookingId))
      .returning();
    
    res.json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Approve booking error:', error);
    res.status(500).json({ error: 'Failed to approve booking' });
  }
});

router.put('/api/bookings/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.update(bookings)
      .set({ status: 'declined' })
      .where(eq(bookings.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Decline booking error:', error);
    res.status(500).json({ error: 'Failed to decline booking' });
  }
});

router.post('/api/bookings', async (req, res) => {
  try {
    const { resource_id, user_email, booking_date, start_time, end_time, notes } = req.body;
    
    const userResult = await db.select({
      id: users.id,
      tier: users.tier,
      tags: users.tags
    })
      .from(users)
      .where(eq(users.email, user_email));
    
    const user = userResult[0];
    const userTier = user?.tier || 'Social';
    let userTags: string[] = [];
    try {
      if (user?.tags) {
        userTags = typeof user.tags === 'string' ? JSON.parse(user.tags) : (Array.isArray(user.tags) ? user.tags : []);
      }
    } catch { userTags = []; }
    
    const isMemberAuthorized = await isAuthorizedForMemberBooking(userTier, userTags);
    
    if (!isMemberAuthorized) {
      return res.status(402).json({ 
        error: 'Membership upgrade required',
        bookingType: 'upgrade_required',
        message: 'Simulator booking is available for Core, Premium, VIP, and Corporate members'
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
    
    const result = await db.insert(bookings)
      .values({
        resourceId: resource_id,
        userEmail: user_email,
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
    if (!isProduction) console.error('Booking request error:', error);
    res.status(500).json({ error: 'Failed to submit booking request' });
  }
});

router.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(bookings)
      .set({ status: 'cancelled' })
      .where(eq(bookings.id, parseInt(id)));
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
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
    if (!isProduction) console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

export default router;
