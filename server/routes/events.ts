import { Router } from 'express';
import { isProduction } from '../core/db';
import { db } from '../db';
import { events, eventRsvps } from '../../shared/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
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
    const conditions: any[] = [];
    
    if (date) {
      conditions.push(eq(events.eventDate, date as string));
    } else if (include_past !== 'true') {
      conditions.push(gte(events.eventDate, sql`CURRENT_DATE`));
    }
    
    if (visibility) {
      conditions.push(eq(events.visibility, visibility as string));
    }
    
    const query = db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      event_date: events.eventDate,
      start_time: events.startTime,
      end_time: events.endTime,
      location: events.location,
      category: events.category,
      image_url: events.imageUrl,
      max_attendees: events.maxAttendees,
      eventbrite_id: events.eventbriteId,
      eventbrite_url: events.eventbriteUrl,
      source: events.source,
      visibility: events.visibility,
      requires_rsvp: events.requiresRsvp,
      google_calendar_id: events.googleCalendarId,
    }).from(events);
    
    let result;
    if (conditions.length > 0) {
      result = await query.where(and(...conditions)).orderBy(events.eventDate, events.startTime);
    } else {
      result = await query.orderBy(events.eventDate, events.startTime);
    }
    
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/events', async (req, res) => {
  try {
    const { title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, visibility, requires_rsvp } = req.body;
    
    const result = await db.insert(events).values({
      title,
      description,
      eventDate: event_date,
      startTime: start_time,
      endTime: end_time,
      location,
      category,
      imageUrl: image_url,
      maxAttendees: max_attendees,
      source: 'manual',
      visibility: visibility || 'public',
      requiresRsvp: requires_rsvp || false,
    }).returning();
    
    res.status(201).json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, start_time, end_time, location, category, image_url, max_attendees } = req.body;
    
    const result = await db.update(events).set({
      title,
      description,
      eventDate: event_date,
      startTime: start_time,
      endTime: end_time,
      location,
      category,
      imageUrl: image_url,
      maxAttendees: max_attendees,
    }).where(eq(events.id, parseInt(id))).returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Event update error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(events).where(eq(events.id, parseInt(id)));
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

      const existing = await db.select({ id: events.id })
        .from(events)
        .where(eq(events.eventbriteId, eventbriteId));

      if (existing.length > 0) {
        await db.update(events).set({
          title,
          description,
          eventDate,
          startTime,
          endTime,
          location,
          imageUrl,
          eventbriteUrl,
          maxAttendees,
          source: 'eventbrite',
          visibility: 'members_only',
          requiresRsvp: true,
        }).where(eq(events.eventbriteId, eventbriteId));
        updated++;
      } else {
        await db.insert(events).values({
          title,
          description,
          eventDate,
          startTime,
          endTime,
          location,
          category: 'Social',
          imageUrl,
          eventbriteId,
          eventbriteUrl,
          maxAttendees,
          source: 'eventbrite',
          visibility: 'members_only',
          requiresRsvp: true,
        });
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
    
    const conditions = [
      eq(eventRsvps.status, 'confirmed'),
      gte(events.eventDate, sql`CURRENT_DATE`),
    ];
    
    if (user_email) {
      conditions.push(eq(eventRsvps.userEmail, user_email as string));
    }
    
    const result = await db.select({
      id: eventRsvps.id,
      event_id: eventRsvps.eventId,
      user_email: eventRsvps.userEmail,
      status: eventRsvps.status,
      created_at: eventRsvps.createdAt,
      title: events.title,
      event_date: events.eventDate,
      start_time: events.startTime,
      location: events.location,
      category: events.category,
      image_url: events.imageUrl,
    })
    .from(eventRsvps)
    .innerJoin(events, eq(eventRsvps.eventId, events.id))
    .where(and(...conditions))
    .orderBy(events.eventDate, events.startTime);
    
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/rsvps', async (req, res) => {
  try {
    const { event_id, user_email } = req.body;
    
    const result = await db.insert(eventRsvps).values({
      eventId: event_id,
      userEmail: user_email,
    }).onConflictDoUpdate({
      target: [eventRsvps.eventId, eventRsvps.userEmail],
      set: { status: 'confirmed' },
    }).returning();
    
    res.status(201).json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.delete('/api/rsvps/:event_id/:user_email', async (req, res) => {
  try {
    const { event_id, user_email } = req.params;
    await db.update(eventRsvps)
      .set({ status: 'cancelled' })
      .where(and(
        eq(eventRsvps.eventId, parseInt(event_id)),
        eq(eventRsvps.userEmail, user_email)
      ));
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
