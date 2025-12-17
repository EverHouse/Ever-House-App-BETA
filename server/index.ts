import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { Client } from '@hubspot/api-client';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

const app = express();

const corsOptions = {
  origin: isProduction 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

if (isProduction) {
  app.use(express.static(path.join(__dirname, '../dist')));
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let connectionSettings: any;

async function getHubSpotAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=hubspot',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then((data: any) => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('HubSpot not connected');
  }
  return accessToken;
}

async function getHubSpotClient() {
  const accessToken = await getHubSpotAccessToken();
  return new Client({ accessToken });
}

// Google Calendar Integration
let googleCalendarConnectionSettings: any;

async function getGoogleCalendarAccessToken() {
  if (googleCalendarConnectionSettings && googleCalendarConnectionSettings.settings.expires_at && new Date(googleCalendarConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return googleCalendarConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  googleCalendarConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then((data: any) => data.items?.[0]);

  const accessToken = googleCalendarConnectionSettings?.settings?.access_token || googleCalendarConnectionSettings.settings?.oauth?.credentials?.access_token;

  if (!googleCalendarConnectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getGoogleCalendarClient() {
  const accessToken = await getGoogleCalendarAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

async function createCalendarEvent(booking: any, bayName: string): Promise<string | null> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const startDateTime = new Date(`${booking.request_date}T${booking.start_time}`);
    const endDateTime = new Date(`${booking.request_date}T${booking.end_time}`);
    
    const event = {
      summary: `Simulator: ${booking.user_name || booking.user_email}`,
      description: `Bay: ${bayName}\nMember: ${booking.user_email}\nDuration: ${booking.duration_minutes} minutes${booking.notes ? '\nNotes: ' + booking.notes : ''}`,
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
      calendarId: 'primary',
      requestBody: event,
    });
    
    return response.data.id || null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const calendar = await getGoogleCalendarClient();
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

app.get('/api/resources', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM resources ORDER BY type, name');
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const { user_email, date, resource_id } = req.query;
    let query = 'SELECT b.*, r.name as resource_name, r.type as resource_type FROM bookings b JOIN resources r ON b.resource_id = r.id WHERE b.status = $1';
    const params: any[] = ['confirmed'];
    
    if (user_email) {
      params.push(user_email);
      query += ` AND b.user_email = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND b.booking_date = $${params.length}`;
    }
    if (resource_id) {
      params.push(resource_id);
      query += ` AND b.resource_id = $${params.length}`;
    }
    
    query += ' ORDER BY b.booking_date, b.start_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { resource_id, user_email, booking_date, start_time, end_time, notes } = req.body;
    
    const existingResult = await pool.query(
      `SELECT * FROM bookings 
       WHERE resource_id = $1 AND booking_date = $2 
       AND status = 'confirmed'
       AND (
         (start_time <= $3 AND end_time > $3) OR
         (start_time < $4 AND end_time >= $4) OR
         (start_time >= $3 AND end_time <= $4)
       )`,
      [resource_id, booking_date, start_time, end_time]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Time slot is already booked' });
    }
    
    const result = await pool.query(
      `INSERT INTO bookings (resource_id, user_email, booking_date, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [resource_id, user_email, booking_date, start_time, end_time, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.get('/api/availability', async (req, res) => {
  try {
    const { resource_id, date, duration } = req.query;
    
    if (!resource_id || !date) {
      return res.status(400).json({ error: 'resource_id and date are required' });
    }
    
    const durationMinutes = parseInt(duration as string) || 60;
    const slotDurationHours = Math.ceil(durationMinutes / 60);
    
    const bookedSlots = await pool.query(
      `SELECT start_time, end_time FROM bookings 
       WHERE resource_id = $1 AND booking_date = $2 AND status = 'confirmed'`,
      [resource_id, date]
    );
    
    const slots = [];
    const openHour = 8;
    const closeHour = 22;
    
    for (let hour = openHour; hour <= closeHour - slotDurationHours; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const endHour = hour + slotDurationHours;
      const endTime = `${endHour.toString().padStart(2, '0')}:00:00`;
      
      const hasConflict = bookedSlots.rows.some((booking: any) => {
        const bookStart = booking.start_time;
        const bookEnd = booking.end_time;
        return (startTime < bookEnd && endTime > bookStart);
      });
      
      slots.push({
        start_time: startTime,
        end_time: endTime,
        available: !hasConflict
      });
    }
    
    res.json(slots);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const { date, include_past } = req.query;
    let query = 'SELECT id, title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, eventbrite_id, eventbrite_url FROM events';
    const params: any[] = [];
    
    if (date) {
      params.push(date);
      query += ' WHERE event_date = $1';
    } else if (include_past !== 'true') {
      query += ' WHERE event_date >= CURRENT_DATE';
    }
    
    query += ' ORDER BY event_date, start_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, event_date, start_time, end_time, location, category, image_url, max_attendees } = req.body;
    
    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, start_time, end_time, location, category, image_url, max_attendees)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, event_date, start_time, end_time, location, category, image_url, max_attendees]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.put('/api/events/:id', async (req, res) => {
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

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Event delete error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Eventbrite Sync Endpoint
app.post('/api/eventbrite/sync', async (req, res) => {
  try {
    const eventbriteToken = process.env.EVENTBRITE_PRIVATE_TOKEN;
    if (!eventbriteToken) {
      return res.status(400).json({ error: 'Eventbrite token not configured' });
    }

    // Fetch user's organization ID first
    const meResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations/', {
      headers: { 'Authorization': `Bearer ${eventbriteToken}` }
    });
    
    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      if (!isProduction) console.error('Eventbrite org fetch error:', errorText);
      return res.status(400).json({ error: 'Failed to fetch Eventbrite organizations' });
    }
    
    const orgData = await meResponse.json();
    const organizationId = orgData.organizations?.[0]?.id;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'No Eventbrite organization found' });
    }

    // Fetch events from Eventbrite
    const eventsResponse = await fetch(
      `https://www.eventbriteapi.com/v3/organizations/${organizationId}/events/?status=live,started,ended&order_by=start_desc`,
      { headers: { 'Authorization': `Bearer ${eventbriteToken}` } }
    );

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      if (!isProduction) console.error('Eventbrite events fetch error:', errorText);
      return res.status(400).json({ error: 'Failed to fetch Eventbrite events' });
    }

    const eventsData = await eventsResponse.json();
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

      // Check if event already exists
      const existing = await pool.query(
        'SELECT id FROM events WHERE eventbrite_id = $1',
        [eventbriteId]
      );

      if (existing.rows.length > 0) {
        // Update existing event
        await pool.query(
          `UPDATE events SET title = $1, description = $2, event_date = $3, start_time = $4, 
           end_time = $5, location = $6, image_url = $7, eventbrite_url = $8, max_attendees = $9
           WHERE eventbrite_id = $10`,
          [title, description, eventDate, startTime, endTime, location, imageUrl, eventbriteUrl, maxAttendees, eventbriteId]
        );
        updated++;
      } else {
        // Insert new event
        await pool.query(
          `INSERT INTO events (title, description, event_date, start_time, end_time, location, category, image_url, eventbrite_id, eventbrite_url, max_attendees)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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

app.get('/api/rsvps', async (req, res) => {
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

app.post('/api/rsvps', async (req, res) => {
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

app.delete('/api/rsvps/:event_id/:user_email', async (req, res) => {
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

app.get('/api/hubspot/contacts', async (req, res) => {
  try {
    const hubspot = await getHubSpotClient();
    
    const response = await hubspot.crm.contacts.basicApi.getPage(100, undefined, [
      'firstname',
      'lastname',
      'email',
      'phone',
      'company',
      'hs_lead_status',
      'createdate',
      'membership_tier',
      'membership_status'
    ]);
    
    const contacts = response.results.map((contact: any) => ({
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || '',
      phone: contact.properties.phone || '',
      company: contact.properties.company || '',
      status: contact.properties.membership_status || contact.properties.hs_lead_status || 'Active',
      tier: contact.properties.membership_tier || '',
      createdAt: contact.properties.createdate
    }));
    
    res.json(contacts);
  } catch (error: any) {
    if (!isProduction) console.error('HubSpot error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

app.get('/api/hubspot/contacts/:id', async (req, res) => {
  try {
    const hubspot = await getHubSpotClient();
    const { id } = req.params;
    
    const contact = await hubspot.crm.contacts.basicApi.getById(id, [
      'firstname',
      'lastname',
      'email',
      'phone',
      'company',
      'hs_lead_status',
      'createdate',
      'membership_tier',
      'membership_status'
    ]);
    
    res.json({
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || '',
      phone: contact.properties.phone || '',
      company: contact.properties.company || '',
      status: contact.properties.membership_status || contact.properties.hs_lead_status || 'Active',
      tier: contact.properties.membership_tier || '',
      createdAt: contact.properties.createdate
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.put('/api/members/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['member', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, id]
    );
    
    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO users (id, role) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET role = $2 RETURNING *',
        [id, role]
      );
      return res.json(insertResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

const TIER_GUEST_PASSES: Record<string, number> = {
  'Social': 2,
  'Core': 4,
  'Premium': 8,
  'Corporate': 15
};

app.get('/api/guest-passes/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { tier } = req.query;
    const passesTotal = TIER_GUEST_PASSES[tier as string] || 4;
    
    let result = await pool.query(
      'SELECT * FROM guest_passes WHERE member_email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO guest_passes (member_email, passes_used, passes_total) VALUES ($1, 0, $2)',
        [email, passesTotal]
      );
      result = await pool.query(
        'SELECT * FROM guest_passes WHERE member_email = $1',
        [email]
      );
    } else if (result.rows[0].passes_total !== passesTotal) {
      await pool.query(
        'UPDATE guest_passes SET passes_total = $1 WHERE member_email = $2',
        [passesTotal, email]
      );
      result.rows[0].passes_total = passesTotal;
    }
    
    const data = result.rows[0];
    res.json({
      passes_used: data.passes_used,
      passes_total: data.passes_total,
      passes_remaining: data.passes_total - data.passes_used
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.post('/api/guest-passes/:email/use', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(
      'UPDATE guest_passes SET passes_used = passes_used + 1 WHERE member_email = $1 AND passes_used < passes_total RETURNING *',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No guest passes remaining' });
    }
    
    const data = result.rows[0];
    res.json({
      passes_used: data.passes_used,
      passes_total: data.passes_total,
      passes_remaining: data.passes_total - data.passes_used
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.put('/api/guest-passes/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { passes_total } = req.body;
    
    const result = await pool.query(
      'UPDATE guest_passes SET passes_total = $1 WHERE member_email = $2 RETURNING *',
      [passes_total, email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const data = result.rows[0];
    res.json({
      passes_used: data.passes_used,
      passes_total: data.passes_total,
      passes_remaining: data.passes_total - data.passes_used
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

const HUBSPOT_FORMS: Record<string, string> = {
  'tour-request': process.env.HUBSPOT_FORM_TOUR_REQUEST || '',
  'membership': process.env.HUBSPOT_FORM_MEMBERSHIP || '',
  'private-hire': process.env.HUBSPOT_FORM_PRIVATE_HIRE || '',
  'guest-checkin': process.env.HUBSPOT_FORM_GUEST_CHECKIN || ''
};

app.post('/api/hubspot/forms/:formType', async (req, res) => {
  try {
    const { formType } = req.params;
    const formId = HUBSPOT_FORMS[formType];
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    
    if (!formId || !portalId) {
      return res.status(400).json({ error: 'Invalid form type or missing configuration' });
    }
    
    const { fields, context } = req.body;
    
    if (formType === 'guest-checkin') {
      const memberEmailField = fields.find((f: { name: string; value: string }) => f.name === 'member_email');
      if (!memberEmailField?.value) {
        return res.status(400).json({ error: 'Member email is required for guest check-in' });
      }
      
      const memberEmail = memberEmailField.value;
      
      const updateResult = await pool.query(
        `UPDATE guest_passes 
         SET passes_used = passes_used + 1 
         WHERE member_email = $1 AND passes_used < passes_total
         RETURNING passes_used, passes_total`,
        [memberEmail]
      );
      
      if (updateResult.rows.length === 0) {
        const passCheck = await pool.query(
          'SELECT passes_used, passes_total FROM guest_passes WHERE member_email = $1',
          [memberEmail]
        );
        
        if (passCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Guest pass record not found. Please contact staff.' });
        }
        
        return res.status(400).json({ error: 'No guest passes remaining. Please contact staff for assistance.' });
      }
    }
    
    const hubspotPayload = {
      fields: fields.map((f: { name: string; value: string }) => ({
        objectTypeId: '0-1',
        name: f.name,
        value: f.value
      })),
      context: {
        pageUri: context?.pageUri || '',
        pageName: context?.pageName || '',
        ...(context?.hutk && { hutk: context.hutk })
      }
    };
    
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hubspotPayload)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      if (!isProduction) console.error('HubSpot form error:', errorData);
      return res.status(response.status).json({ error: 'Form submission failed' });
    }
    
    const result: any = await response.json();
    res.json({ success: true, message: result.inlineMessage || 'Form submitted successfully' });
  } catch (error: any) {
    if (!isProduction) console.error('HubSpot form submission error:', error);
    res.status(500).json({ error: 'Form submission failed' });
  }
});

// ============== SIMULATOR BOOKING REQUEST SYSTEM ==============

// Get all active bays
app.get('/api/bays', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bays WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Bays error:', error);
    res.status(500).json({ error: 'Failed to fetch bays' });
  }
});

// Get availability for a bay on a specific date
app.get('/api/bays/:bayId/availability', async (req, res) => {
  try {
    const { bayId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    // Get approved bookings for this bay on this date
    const bookings = await pool.query(
      `SELECT start_time, end_time, user_name FROM booking_requests 
       WHERE bay_id = $1 AND request_date = $2 AND status = 'approved'
       ORDER BY start_time`,
      [bayId, date]
    );
    
    // Get availability blocks for this bay on this date
    const blocks = await pool.query(
      `SELECT start_time, end_time, block_type, notes FROM availability_blocks 
       WHERE bay_id = $1 AND block_date = $2
       ORDER BY start_time`,
      [bayId, date]
    );
    
    res.json({
      bookings: bookings.rows,
      blocks: blocks.rows
    });
  } catch (error: any) {
    if (!isProduction) console.error('Availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Get all booking requests (for staff) or user's requests (for members)
app.get('/api/booking-requests', async (req, res) => {
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

// Create a new booking request
app.post('/api/booking-requests', async (req, res) => {
  try {
    const { user_email, user_name, bay_id, bay_preference, request_date, start_time, duration_minutes, notes } = req.body;
    
    if (!user_email || !request_date || !start_time || !duration_minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Calculate end time
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

// Update booking request status (approve/decline)
app.put('/api/booking-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staff_notes, suggested_time, reviewed_by, bay_id } = req.body;
    
    if (!['pending', 'approved', 'declined', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // If approving, check for conflicts
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
      
      // Check for overlapping approved bookings
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
      
      // Get bay name for calendar event
      const bayResult = await pool.query('SELECT name FROM bays WHERE id = $1', [assignedBayId]);
      const bayName = bayResult.rows[0]?.name || 'Simulator';
      
      // Create Google Calendar event
      let calendarEventId: string | null = null;
      try {
        calendarEventId = await createCalendarEvent(req_data, bayName);
      } catch (calError) {
        console.error('Calendar sync failed (non-blocking):', calError);
      }
      
      // Update with bay assignment and calendar event ID
      const result = await pool.query(
        `UPDATE booking_requests 
         SET status = $1, staff_notes = $2, suggested_time = $3, reviewed_by = $4, reviewed_at = CURRENT_TIMESTAMP, bay_id = $5, calendar_event_id = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 RETURNING *`,
        [status, staff_notes, suggested_time, reviewed_by, assignedBayId, calendarEventId, id]
      );
      
      // Create notification for member
      const updated = result.rows[0];
      await pool.query(
        `INSERT INTO notifications (user_email, title, message, type, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          updated.user_email,
          'Booking Request Approved',
          `Your simulator booking for ${updated.request_date} at ${updated.start_time.substring(0, 5)} has been approved.`,
          'booking_approved',
          updated.id,
          'booking_request'
        ]
      );
      
      return res.json(result.rows[0]);
    }
    
    // For decline
    if (status === 'declined') {
      const result = await pool.query(
        `UPDATE booking_requests 
         SET status = $1, staff_notes = $2, suggested_time = $3, reviewed_by = $4, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [status, staff_notes, suggested_time, reviewed_by, id]
      );
      
      const updated = result.rows[0];
      const message = suggested_time 
        ? `Your simulator booking request for ${updated.request_date} was declined. Suggested alternative: ${suggested_time.substring(0, 5)}`
        : `Your simulator booking request for ${updated.request_date} was declined.${staff_notes ? ' Note: ' + staff_notes : ''}`;
      
      await pool.query(
        `INSERT INTO notifications (user_email, title, message, type, related_id, related_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [updated.user_email, 'Booking Request Declined', message, 'booking_declined', updated.id, 'booking_request']
      );
      
      return res.json(result.rows[0]);
    }
    
    // For cancellation, delete calendar event if exists
    if (status === 'cancelled') {
      const existing = await pool.query('SELECT calendar_event_id FROM booking_requests WHERE id = $1', [id]);
      if (existing.rows[0]?.calendar_event_id) {
        try {
          await deleteCalendarEvent(existing.rows[0].calendar_event_id);
        } catch (calError) {
          console.error('Failed to delete calendar event (non-blocking):', calError);
        }
      }
    }
    
    // Generic update
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

// Get approved bookings for calendar view (all bays, date range)
app.get('/api/approved-bookings', async (req, res) => {
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

// ============== NOTIFICATIONS ==============

// Get notifications for a user
app.get('/api/notifications', async (req, res) => {
  try {
    const { user_email, unread_only } = req.query;
    
    if (!user_email) {
      return res.status(400).json({ error: 'user_email is required' });
    }
    
    let query = 'SELECT * FROM notifications WHERE user_email = $1';
    const params: any[] = [user_email];
    
    if (unread_only === 'true') {
      query += ' AND is_read = false';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notification count
app.get('/api/notifications/count', async (req, res) => {
  try {
    const { user_email } = req.query;
    
    if (!user_email) {
      return res.status(400).json({ error: 'user_email is required' });
    }
    
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_email = $1 AND is_read = false',
      [user_email]
    );
    
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error: any) {
    if (!isProduction) console.error('Notification count error:', error);
    res.status(500).json({ error: 'Failed to fetch notification count' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Notification update error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read for a user
app.put('/api/notifications/mark-all-read', async (req, res) => {
  try {
    const { user_email } = req.body;
    
    if (!user_email) {
      return res.status(400).json({ error: 'user_email is required' });
    }
    
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_email = $1 AND is_read = false',
      [user_email]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Staff: Create availability block
app.post('/api/availability-blocks', async (req, res) => {
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

// Staff: Get availability blocks for date range
app.get('/api/availability-blocks', async (req, res) => {
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

// Staff: Delete availability block
app.delete('/api/availability-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM availability_blocks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Delete block error:', error);
    res.status(500).json({ error: 'Failed to delete availability block' });
  }
});

if (isProduction) {
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    } else {
      next();
    }
  });
}

const PORT = Number(process.env.PORT) || (isProduction ? 80 : 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server running on port ${PORT}`);
});
