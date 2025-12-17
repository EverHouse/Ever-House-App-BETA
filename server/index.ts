import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { Client } from '@hubspot/api-client';

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
    const { date } = req.query;
    let query = 'SELECT * FROM events';
    const params: any[] = [];
    
    if (date) {
      params.push(date);
      query += ' WHERE event_date = $1';
    } else {
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
