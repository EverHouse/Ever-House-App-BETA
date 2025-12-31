import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { isStaffOrAdmin } from '../core/middleware';
import { getCalendarBusyTimes, getCalendarIdByName, CALENDAR_CONFIG } from '../core/calendar';
import { getTodayPacific, getPacificDateParts } from '../utils/dateUtils';

const router = Router();

// Conference room bay ID constant
const CONFERENCE_ROOM_BAY_ID = 11;

router.get('/api/availability', async (req, res) => {
  try {
    const { resource_id, date, duration, ignore_booking_id } = req.query;
    
    if (!resource_id || !date) {
      return res.status(400).json({ error: 'resource_id and date are required' });
    }
    
    const durationMinutes = parseInt(duration as string) || 60;
    // Fixed 5-minute increment for more flexible start times
    const slotIncrement = 5;
    
    // Get resource type to determine business hours
    const resourceResult = await pool.query(
      `SELECT type FROM resources WHERE id = $1`,
      [resource_id]
    );
    const resourceType = resourceResult.rows[0]?.type || 'simulator';
    
    // When rescheduling, ignore the original booking so its slot shows as available
    const ignoreId = ignore_booking_id ? parseInt(ignore_booking_id as string) : null;
    
    const bookedSlots = ignoreId
      ? await pool.query(
          `SELECT start_time, end_time FROM booking_requests 
           WHERE bay_id = $1 AND request_date = $2 AND status = 'approved' AND id != $3`,
          [resource_id, date, ignoreId]
        )
      : await pool.query(
          `SELECT start_time, end_time FROM booking_requests 
           WHERE bay_id = $1 AND request_date = $2 AND status = 'approved'`,
          [resource_id, date]
        );
    
    const blockedSlots = await pool.query(
      `SELECT start_time, end_time FROM availability_blocks 
       WHERE bay_id = $1 AND block_date = $2`,
      [resource_id, date]
    );
    
    // For conference room, also fetch busy times from Google Calendar (Mindbody bookings)
    let calendarBusySlots: { start_time: string; end_time: string }[] = [];
    const isConferenceRoom = resourceType === 'conference_room';
    if (isConferenceRoom) {
      try {
        const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.conference.name);
        if (calendarId) {
          const busyPeriods = await getCalendarBusyTimes(calendarId, date as string);
          // Convert busy periods to time strings with seconds for consistent comparison
          calendarBusySlots = busyPeriods.map(period => {
            const startStr = period.start.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/Los_Angeles'
            });
            const endStr = period.end.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/Los_Angeles'
            });
            return {
              start_time: startStr + ':00',
              end_time: endStr + ':00'
            };
          });
        }
      } catch (calError) {
        console.error('Failed to fetch Google Calendar busy times (non-blocking):', calError);
      }
    }
    
    const slots = [];
    
    // Use Pacific timezone utilities for accurate time calculations
    const todayStr = getTodayPacific();
    const isToday = date === todayStr;
    const pacificParts = getPacificDateParts();
    const currentMinutes = isToday ? pacificParts.hour * 60 + pacificParts.minute : 0;
    
    // Get day of week for the requested date (0 = Sunday, 1 = Monday, etc.)
    const requestedDate = new Date(date as string + 'T12:00:00');
    const dayOfWeek = requestedDate.getDay();
    
    // Business hours by day of week:
    // Monday (1): Closed
    // Tuesday-Thursday (2-4): 8:30 AM - 8 PM
    // Friday-Saturday (5-6): 8:30 AM - 10 PM
    // Sunday (0): 8:30 AM - 6 PM
    const getBusinessHours = (day: number): { open: number; close: number } | null => {
      const openMinutes = 8 * 60 + 30; // 8:30 AM
      switch (day) {
        case 1: // Monday - Closed
          return null;
        case 2: // Tuesday
        case 3: // Wednesday
        case 4: // Thursday
          return { open: openMinutes, close: 20 * 60 }; // 8 PM
        case 5: // Friday
        case 6: // Saturday
          return { open: openMinutes, close: 22 * 60 }; // 10 PM
        case 0: // Sunday
          return { open: openMinutes, close: 18 * 60 }; // 6 PM
        default:
          return null;
      }
    };
    
    const hours = getBusinessHours(dayOfWeek);
    
    // Return empty slots if closed (Monday or invalid day)
    if (!hours) {
      return res.json([]);
    }
    
    const openMinutes = hours.open;
    const closeMinutes = hours.close;
    
    for (let startMins = openMinutes; startMins + durationMinutes <= closeMinutes; startMins += slotIncrement) {
      // Skip past time slots for today
      if (isToday && startMins <= currentMinutes) {
        continue;
      }
      const startHour = Math.floor(startMins / 60);
      const startMin = startMins % 60;
      const endMins = startMins + durationMinutes;
      const endHour = Math.floor(endMins / 60);
      const endMin = endMins % 60;
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:00`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;
      
      const hasBookingConflict = bookedSlots.rows.some((booking: any) => {
        const bookStart = booking.start_time;
        const bookEnd = booking.end_time;
        return (startTime < bookEnd && endTime > bookStart);
      });
      
      const hasBlockConflict = blockedSlots.rows.some((block: any) => {
        const blockStart = block.start_time;
        const blockEnd = block.end_time;
        return (startTime < blockEnd && endTime > blockStart);
      });
      
      // Check Google Calendar busy times (for Mindbody conference room bookings)
      const hasCalendarConflict = calendarBusySlots.some((busy) => {
        return (startTime < busy.end_time && endTime > busy.start_time);
      });
      
      slots.push({
        start_time: startTime,
        end_time: endTime,
        available: !hasBookingConflict && !hasBlockConflict && !hasCalendarConflict
      });
    }
    
    res.json(slots);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/availability-blocks', isStaffOrAdmin, async (req, res) => {
  try {
    const { bay_id, block_date, start_time, end_time, block_type, notes, created_by } = req.body;
    
    if (!bay_id || !block_date || !start_time || !end_time || !block_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO availability_blocks (bay_id, block_date, start_time, end_time, block_type, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [bay_id, block_date, start_time, end_time, block_type, notes, created_by]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Availability block creation error:', error);
    res.status(500).json({ error: 'Failed to create availability block' });
  }
});

router.get('/api/availability-blocks', async (req, res) => {
  try {
    const { start_date, end_date, bay_id } = req.query;
    
    let query = `SELECT ab.*, b.name as bay_name FROM availability_blocks ab
                 JOIN bays b ON ab.bay_id = b.id WHERE 1=1`;
    const params: any[] = [];
    
    if (start_date) {
      params.push(start_date);
      query += ` AND ab.block_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND ab.block_date <= $${params.length}`;
    }
    if (bay_id) {
      params.push(bay_id);
      query += ` AND ab.bay_id = $${params.length}`;
    }
    
    query += ' ORDER BY ab.block_date, ab.start_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Availability blocks error:', error);
    res.status(500).json({ error: 'Failed to fetch availability blocks' });
  }
});

router.put('/api/availability-blocks/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { bay_id, block_date, start_time, end_time, block_type, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE availability_blocks 
       SET bay_id = COALESCE($1, bay_id),
           block_date = COALESCE($2, block_date),
           start_time = COALESCE($3, start_time),
           end_time = COALESCE($4, end_time),
           block_type = COALESCE($5, block_type),
           notes = $6
       WHERE id = $7 RETURNING *`,
      [bay_id, block_date, start_time, end_time, block_type, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Update block error:', error);
    res.status(500).json({ error: 'Failed to update availability block' });
  }
});

router.delete('/api/availability-blocks/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM availability_blocks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Delete block error:', error);
    res.status(500).json({ error: 'Failed to delete availability block' });
  }
});

export default router;
