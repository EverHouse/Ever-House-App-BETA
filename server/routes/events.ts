import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { syncGoogleCalendarEvents } from '../core/calendar';

const router = Router();

router.post('/api/events/sync/google', async (req, res) => {
  try {
    const result = await syncGoogleCalendarEvents();
    if (result.error) {
      return res.status(404).json(result);
    }
    res.json({
      success: true,
      message: `Synced ${result.synced} events from Google Calendar`,
      ...result
    });
  } catch (error: any) {
    if (!isProduction) console.error('Google Calendar sync error:', error);
    res.status(500).json({ error: 'Failed to sync Google Calendar events' });
  }
});

router.post('/api/events/sync', async (req, res) => {
  try {
    const googleResult = await syncGoogleCalendarEvents();
    
    let eventbriteResult = { synced: 0, created: 0, updated: 0, error: 'No Eventbrite token configured' };
    const eventbriteToken = process.env.EVENTBRITE_PRIVATE_TOKEN;
    if (eventbriteToken) {
      eventbriteResult = { synced: 0, created: 0, updated: 0, error: undefined as any };
    }
    
    res.json({
      success: true,
      google: googleResult,
      eventbrite: eventbriteResult.error ? { error: eventbriteResult.error } : eventbriteResult
    });
  } catch (error: any) {
    if (!isProduction) console.error('Event sync error:', error);
    res.status(500).json({ error: 'Failed to sync events' });
  }
});

router.get('/api/events', async (req, res) => {
  try {
    const { date, include_past, visibility } = req.query;
    let query = 'SELECT id, title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, eventbrite_id, eventbrite_url, source, visibility, requires_rsvp, google_calendar_id FROM events';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (date) {
      params.push(date);
      conditions.push(`event_date = $${params.length}`);
    } else if (include_past !== 'true') {
      conditions.push('event_date >= CURRENT_DATE');
    }
    
    if (visibility) {
      params.push(visibility);
      conditions.push(`visibility = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY event_date, start_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/events', async (req, res) => {
  try {
    const { title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, visibility, requires_rsvp } = req.body;
    
    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, source, visibility, requires_rsvp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual', $10, $11) RETURNING *`,
      [title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, visibility || 'public', requires_rsvp || false]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, start_time, end_time, location, category, image_url, max_attendees } = req.body;
    
    const result = await pool.query(
      `UPDATE events SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5, 
       location = $6, category = $7, image_url = $8, max_attendees = $9
       WHERE id = $10 RETURNING *`,
      [title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Event update error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Event delete error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

router.post('/api/eventbrite/sync', async (req, res) => {
  try {
    const eventbriteToken = process.env.EVENTBRITE_PRIVATE_TOKEN;
    if (!eventbriteToken) {
      return res.status(400).json({ error: 'Eventbrite token not configured' });
    }

    const meResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations/', {
      headers: { 'Authorization': `Bearer ${eventbriteToken}` }
    });
    
    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      if (!isProduction) console.error('Eventbrite org fetch error:', errorText);
      return res.status(400).json({ error: 'Failed to fetch Eventbrite organizations' });
    }
    
    const orgData = await meResponse.json() as { organizations?: { id: string }[] };
    const organizationId = orgData.organizations?.[0]?.id;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'No Eventbrite organization found' });
    }

    const eventsResponse = await fetch(
      `https://www.eventbriteapi.com/v3/organizations/${organizationId}/events/?status=live,started,ended&order_by=start_desc`,
      { headers: { 'Authorization': `Bearer ${eventbriteToken}` } }
    );

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      if (!isProduction) console.error('Eventbrite events fetch error:', errorText);
      return res.status(400).json({ error: 'Failed to fetch Eventbrite events' });
    }

    const eventsData = await eventsResponse.json() as { events?: any[] };
    const eventbriteEvents = eventsData.events || [];

    let synced = 0;
    let updated = 0;

    for (const ebEvent of eventbriteEvents) {
      const eventbriteId = ebEvent.id;
      const title = ebEvent.name?.text || 'Untitled Event';
      const description = ebEvent.description?.text || '';
      const eventDate = ebEvent.start?.local?.split('T')[0] || null;
      const startTime = ebEvent.start?.local?.split('T')[1]?.substring(0, 8) || '18:00:00';
      const endTime = ebEvent.end?.local?.split('T')[1]?.substring(0, 8) || '21:00:00';
      const location = ebEvent.venue?.name || ebEvent.online_event ? 'Online Event' : 'TBD';
      const imageUrl = ebEvent.logo?.url || null;
      const eventbriteUrl = ebEvent.url || null;
      const maxAttendees = ebEvent.capacity || null;

      const existing = await pool.query(
        'SELECT id FROM events WHERE eventbrite_id = $1',
        [eventbriteId]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE events SET title = $1, description = $2, event_date = $3, start_time = $4, 
           end_time = $5, location = $6, image_url = $7, eventbrite_url = $8, max_attendees = $9,
           source = 'eventbrite', visibility = 'members_only', requires_rsvp = true
           WHERE eventbrite_id = $10`,
          [title, description, eventDate, startTime, endTime, location, imageUrl, eventbriteUrl, maxAttendees, eventbriteId]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO events (title, description, event_date, start_time, end_time, location, category, image_url, eventbrite_id, eventbrite_url, max_attendees, source, visibility, requires_rsvp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'eventbrite', 'members_only', true)`,
          [title, description, eventDate, startTime, endTime, location, 'Social', imageUrl, eventbriteId, eventbriteUrl, maxAttendees]
        );
        synced++;
      }
    }

    res.json({ 
      success: true, 
      message: `Synced ${synced} new events, updated ${updated} existing events`,
      total: eventbriteEvents.length,
      synced,
      updated
    });
  } catch (error: any) {
    if (!isProduction) console.error('Eventbrite sync error:', error);
    res.status(500).json({ error: 'Failed to sync Eventbrite events' });
  }
});

router.get('/api/rsvps', async (req, res) => {
  try {
    const { user_email } = req.query;
    
    let query = `SELECT r.*, e.title, e.event_date, e.start_time, e.location, e.category, e.image_url 
                 FROM event_rsvps r 
                 JOIN events e ON r.event_id = e.id 
                 WHERE r.status = 'confirmed'`;
    const params: any[] = [];
    
    if (user_email) {
      params.push(user_email);
      query += ` AND r.user_email = $${params.length}`;
    }
    
    query += ' AND e.event_date >= CURRENT_DATE ORDER BY e.event_date, e.start_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/rsvps', async (req, res) => {
  try {
    const { event_id, user_email } = req.body;
    
    const result = await pool.query(
      `INSERT INTO event_rsvps (event_id, user_email) 
       VALUES ($1, $2) 
       ON CONFLICT (event_id, user_email) DO UPDATE SET status = 'confirmed'
       RETURNING *`,
      [event_id, user_email]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.delete('/api/rsvps/:event_id/:user_email', async (req, res) => {
  try {
    const { event_id, user_email } = req.params;
    await pool.query(
      "UPDATE event_rsvps SET status = 'cancelled' WHERE event_id = $1 AND user_email = $2",
      [event_id, user_email]
    );
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
