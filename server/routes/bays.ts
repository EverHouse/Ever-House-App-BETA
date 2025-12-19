import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { getGoogleCalendarClient } from '../core/integrations';
import { CALENDAR_CONFIG, getCalendarIdByName, createCalendarEvent, createCalendarEventOnCalendar, deleteCalendarEvent } from '../core/calendar';
import { sendPushNotification } from './push';

const router = Router();

router.get('/api/bays', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bays WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Bays error:', error);
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
    
    const bookings = await pool.query(
      `SELECT start_time, end_time, user_name FROM booking_requests 
       WHERE bay_id = $1 AND request_date = $2 AND status = 'approved'
       ORDER BY start_time`,
      [bayId, date]
    );
    
    const blocks = await pool.query(
      `SELECT start_time, end_time, block_type, notes FROM availability_blocks 
       WHERE bay_id = $1 AND block_date = $2
       ORDER BY start_time`,
      [bayId, date]
    );
    
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
      bookings: bookings.rows,
      blocks: [...blocks.rows, ...calendarBlocks]
    });
  } catch (error: any) {
    if (!isProduction) console.error('Availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

router.get('/api/booking-requests', async (req, res) => {
  try {
    const { user_email, status, include_all } = req.query;
    
    let query = `SELECT br.*, b.name as bay_name 
                 FROM booking_requests br 
                 LEFT JOIN bays b ON br.bay_id = b.id`;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (user_email && !include_all) {
      params.push(user_email);
      conditions.push(`br.user_email = $${params.length}`);
    }
    
    if (status) {
      params.push(status);
      conditions.push(`br.status = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY br.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Booking requests error:', error);
    res.status(500).json({ error: 'Failed to fetch booking requests' });
  }
});

router.post('/api/booking-requests', async (req, res) => {
  try {
    const { user_email, user_name, bay_id, bay_preference, request_date, start_time, duration_minutes, notes } = req.body;
    
    if (!user_email || !request_date || !start_time || !duration_minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [hours, mins] = start_time.split(':').map(Number);
    const totalMins = hours * 60 + mins + duration_minutes;
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;
    const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
    
    const result = await pool.query(
      `INSERT INTO booking_requests 
       (user_email, user_name, bay_id, bay_preference, request_date, start_time, duration_minutes, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [user_email, user_name, bay_id || null, bay_preference, request_date, start_time, duration_minutes, end_time, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking request creation error:', error);
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
    
    if (status === 'approved') {
      const request = await pool.query('SELECT * FROM booking_requests WHERE id = $1', [id]);
      if (request.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      const req_data = request.rows[0];
      const assignedBayId = bay_id || req_data.bay_id;
      
      if (!assignedBayId) {
        return res.status(400).json({ error: 'Bay must be assigned before approval' });
      }
      
      const conflicts = await pool.query(
        `SELECT * FROM booking_requests 
         WHERE bay_id = $1 AND request_date = $2 AND status = 'approved' AND id != $3
         AND (
           (start_time <= $4 AND end_time > $4) OR
           (start_time < $5 AND end_time >= $5) OR
           (start_time >= $4 AND end_time <= $5)
         )`,
        [assignedBayId, req_data.request_date, id, req_data.start_time, req_data.end_time]
      );
      
      if (conflicts.rows.length > 0) {
        return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
      }
      
      const bayResult = await pool.query('SELECT name FROM bays WHERE id = $1', [assignedBayId]);
      const bayName = bayResult.rows[0]?.name || 'Simulator';
      
      let calendarEventId: string | null = null;
      try {
        const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
        if (golfCalendarId) {
          const summary = `Simulator: ${req_data.user_name || req_data.user_email}`;
          const description = `Bay: ${bayName}\nMember: ${req_data.user_email}\nDuration: ${req_data.duration_minutes} minutes${req_data.notes ? '\nNotes: ' + req_data.notes : ''}`;
          calendarEventId = await createCalendarEventOnCalendar(
            golfCalendarId,
            summary,
            description,
            req_data.request_date,
            req_data.start_time,
            req_data.end_time
          );
        } else {
          calendarEventId = await createCalendarEvent(req_data, bayName);
        }
      } catch (calError) {
        console.error('Calendar sync failed (non-blocking):', calError);
      }
      
      const result = await pool.query(
        `UPDATE booking_requests 
         SET status = $1, staff_notes = $2, suggested_time = $3, reviewed_by = $4, reviewed_at = CURRENT_TIMESTAMP, bay_id = $5, calendar_event_id = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 RETURNING *`,
        [status, staff_notes, suggested_time, reviewed_by, assignedBayId, calendarEventId, id]
      );
      
      const updated = result.rows[0];
      const approvalMessage = `Your simulator booking for ${updated.request_date} at ${updated.start_time.substring(0, 5)} has been approved.`;
      await pool.query(
        `INSERT INTO notifications (user_email, title, message, type, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          updated.user_email,
          'Booking Request Approved',
          approvalMessage,
          'booking_approved',
          updated.id,
          'booking_request'
        ]
      );
      
      await sendPushNotification(updated.user_email, {
        title: 'Booking Approved!',
        body: approvalMessage,
        url: '/#/sims'
      });
      
      return res.json(result.rows[0]);
    }
    
    if (status === 'declined') {
      const result = await pool.query(
        `UPDATE booking_requests 
         SET status = $1, staff_notes = $2, suggested_time = $3, reviewed_by = $4, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [status, staff_notes, suggested_time, reviewed_by, id]
      );
      
      const updated = result.rows[0];
      const declineMessage = suggested_time 
        ? `Your simulator booking request for ${updated.request_date} was declined. Suggested alternative: ${suggested_time.substring(0, 5)}`
        : `Your simulator booking request for ${updated.request_date} was declined.${staff_notes ? ' Note: ' + staff_notes : ''}`;
      
      await pool.query(
        `INSERT INTO notifications (user_email, title, message, type, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [updated.user_email, 'Booking Request Declined', declineMessage, 'booking_declined', updated.id, 'booking_request']
      );
      
      await sendPushNotification(updated.user_email, {
        title: 'Booking Request Update',
        body: declineMessage,
        url: '/#/sims'
      });
      
      return res.json(result.rows[0]);
    }
    
    if (status === 'cancelled') {
      const existing = await pool.query('SELECT calendar_event_id FROM booking_requests WHERE id = $1', [id]);
      if (existing.rows[0]?.calendar_event_id) {
        try {
          const golfCalendarId = await getCalendarIdByName(CALENDAR_CONFIG.golf.name);
          await deleteCalendarEvent(existing.rows[0].calendar_event_id, golfCalendarId || 'primary');
        } catch (calError) {
          console.error('Failed to delete calendar event (non-blocking):', calError);
        }
      }
    }
    
    const result = await pool.query(
      `UPDATE booking_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking request update error:', error);
    res.status(500).json({ error: 'Failed to update booking request' });
  }
});

router.get('/api/approved-bookings', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `SELECT br.*, b.name as bay_name 
                 FROM booking_requests br 
                 JOIN bays b ON br.bay_id = b.id
                 WHERE br.status = 'approved'`;
    const params: any[] = [];
    
    if (start_date) {
      params.push(start_date);
      query += ` AND br.request_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND br.request_date <= $${params.length}`;
    }
    
    query += ' ORDER BY br.request_date, br.start_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Approved bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch approved bookings' });
  }
});

export default router;
