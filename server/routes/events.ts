import { Router } from 'express';
import { isProduction } from '../core/db';
import { isStaffOrAdmin } from '../core/middleware';
import { db } from '../db';
import { events, eventRsvps, users, notifications } from '../../shared/schema';
import { eq, and, sql, gte, desc } from 'drizzle-orm';
import { syncGoogleCalendarEvents, syncWellnessCalendarEvents, backfillWellnessToCalendar, getCalendarIdByName, createCalendarEventOnCalendar, deleteCalendarEvent, updateCalendarEvent, CALENDAR_CONFIG } from '../core/calendar';
import { sendPushNotification } from './push';
import { notifyAllStaffRequired, notifyMemberRequired } from '../core/staffNotifications';
import { createPacificDate, parseLocalDate, formatDateDisplayWithDay } from '../utils/dateUtils';

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

router.post('/api/calendars/sync-all', isStaffOrAdmin, async (req, res) => {
  try {
    const [eventsResult, wellnessResult, backfillResult] = await Promise.all([
      syncGoogleCalendarEvents().catch(() => ({ synced: 0, created: 0, updated: 0, error: 'Events sync failed' })),
      syncWellnessCalendarEvents().catch(() => ({ synced: 0, created: 0, updated: 0, error: 'Wellness sync failed' })),
      backfillWellnessToCalendar().catch(() => ({ created: 0, total: 0, errors: ['Backfill failed'] }))
    ]);
    
    const eventsSynced = eventsResult?.synced || 0;
    const wellnessSynced = wellnessResult?.synced || 0;
    const wellnessBackfilled = backfillResult?.created || 0;
    
    res.json({
      success: true,
      events: {
        synced: eventsSynced,
        created: eventsResult?.created || 0,
        updated: eventsResult?.updated || 0,
        error: eventsResult?.error
      },
      wellness: {
        synced: wellnessSynced,
        created: wellnessResult?.created || 0,
        updated: wellnessResult?.updated || 0,
        error: wellnessResult?.error
      },
      wellnessBackfill: {
        created: wellnessBackfilled,
        total: backfillResult?.total || 0,
        errors: backfillResult?.errors?.length > 0 ? backfillResult.errors : undefined
      },
      message: `Synced ${eventsSynced} events and ${wellnessSynced} wellness classes from Google Calendar. Created ${wellnessBackfilled} calendar events for existing classes.`
    });
  } catch (error: any) {
    if (!isProduction) console.error('Calendar sync error:', error);
    res.status(500).json({ error: 'Failed to sync calendars' });
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
      external_url: events.externalUrl,
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

router.post('/api/events', isStaffOrAdmin, async (req, res) => {
  try {
    const { title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, visibility, requires_rsvp, external_url } = req.body;
    
    const trimmedTitle = title?.toString().trim();
    const trimmedEventDate = event_date?.toString().trim();
    const trimmedStartTime = start_time?.toString().trim();
    const trimmedEndTime = end_time?.toString().trim() || null;
    
    if (!trimmedTitle || !trimmedEventDate || !trimmedStartTime) {
      return res.status(400).json({ error: 'Missing required fields: title, event_date, and start_time are required' });
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    
    if (!dateRegex.test(trimmedEventDate)) {
      return res.status(400).json({ error: 'Invalid event_date format. Use YYYY-MM-DD' });
    }
    
    if (!timeRegex.test(trimmedStartTime)) {
      return res.status(400).json({ error: 'Invalid start_time format. Use HH:MM or HH:MM:SS' });
    }
    
    if (trimmedEndTime && !timeRegex.test(trimmedEndTime)) {
      return res.status(400).json({ error: 'Invalid end_time format. Use HH:MM or HH:MM:SS' });
    }
    
    const testDate = createPacificDate(trimmedEventDate, trimmedStartTime);
    if (isNaN(testDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date/time combination' });
    }
    
    let googleCalendarId: string | null = null;
    try {
      const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.events.name);
      if (calendarId) {
        const eventDescription = [description, location ? `Location: ${location}` : ''].filter(Boolean).join('\n');
        googleCalendarId = await createCalendarEventOnCalendar(
          calendarId,
          trimmedTitle,
          eventDescription,
          trimmedEventDate,
          trimmedStartTime,
          trimmedEndTime || trimmedStartTime
        );
      }
    } catch (calError) {
      if (!isProduction) console.error('Failed to create Google Calendar event:', calError);
    }
    
    const result = await db.insert(events).values({
      title: trimmedTitle,
      description,
      eventDate: trimmedEventDate,
      startTime: trimmedStartTime,
      endTime: trimmedEndTime,
      location,
      category,
      imageUrl: image_url,
      maxAttendees: max_attendees,
      source: 'manual',
      visibility: visibility || 'public',
      requiresRsvp: requires_rsvp || false,
      googleCalendarId: googleCalendarId,
      externalUrl: external_url || null,
    }).returning();
    
    res.status(201).json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/api/events/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, start_time, end_time, location, category, image_url, max_attendees, external_url } = req.body;
    
    const trimmedTitle = title?.toString().trim();
    const trimmedEventDate = event_date?.toString().trim();
    const trimmedStartTime = start_time?.toString().trim();
    const trimmedEndTime = end_time?.toString().trim() || null;
    
    if (!trimmedTitle || !trimmedEventDate || !trimmedStartTime) {
      return res.status(400).json({ error: 'Missing required fields: title, event_date, and start_time are required' });
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    
    if (!dateRegex.test(trimmedEventDate)) {
      return res.status(400).json({ error: 'Invalid event_date format. Use YYYY-MM-DD' });
    }
    
    if (!timeRegex.test(trimmedStartTime)) {
      return res.status(400).json({ error: 'Invalid start_time format. Use HH:MM or HH:MM:SS' });
    }
    
    if (trimmedEndTime && !timeRegex.test(trimmedEndTime)) {
      return res.status(400).json({ error: 'Invalid end_time format. Use HH:MM or HH:MM:SS' });
    }
    
    const testDate = createPacificDate(trimmedEventDate, trimmedStartTime);
    if (isNaN(testDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date/time combination' });
    }
    
    const existing = await db.select({ googleCalendarId: events.googleCalendarId }).from(events).where(eq(events.id, parseInt(id)));
    
    const result = await db.update(events).set({
      title: trimmedTitle,
      description,
      eventDate: trimmedEventDate,
      startTime: trimmedStartTime,
      endTime: trimmedEndTime,
      location,
      category,
      imageUrl: image_url,
      maxAttendees: max_attendees,
      externalUrl: external_url || null,
    }).where(eq(events.id, parseInt(id))).returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (existing.length > 0 && existing[0].googleCalendarId) {
      try {
        const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.events.name);
        if (calendarId) {
          const eventDescription = [description, location ? `Location: ${location}` : ''].filter(Boolean).join('\n');
          await updateCalendarEvent(
            existing[0].googleCalendarId,
            calendarId,
            trimmedTitle,
            eventDescription,
            trimmedEventDate,
            trimmedStartTime,
            trimmedEndTime || trimmedStartTime
          );
        }
      } catch (calError) {
        if (!isProduction) console.error('Failed to update Google Calendar event:', calError);
      }
    }
    
    res.json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Event update error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/api/events/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await db.select({ googleCalendarId: events.googleCalendarId }).from(events).where(eq(events.id, parseInt(id)));
    if (existing.length > 0 && existing[0].googleCalendarId) {
      try {
        const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.events.name);
        if (calendarId) {
          await deleteCalendarEvent(existing[0].googleCalendarId, calendarId);
        }
      } catch (calError) {
        if (!isProduction) console.error('Failed to delete Google Calendar event:', calError);
      }
    }
    
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
      return res.json({ 
        success: true, 
        skipped: true, 
        synced: 0, 
        message: 'Eventbrite not configured - skipping sync' 
      });
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
    
    const eventData = await db.select({
      title: events.title,
      eventDate: events.eventDate,
      startTime: events.startTime,
      location: events.location
    }).from(events).where(eq(events.id, event_id));
    
    if (eventData.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const evt = eventData[0];
    const formattedDate = formatDateDisplayWithDay(evt.eventDate);
    const formattedTime = evt.startTime?.substring(0, 5) || '';
    const memberMessage = `You're confirmed for ${evt.title} on ${formattedDate}${formattedTime ? ` at ${formattedTime}` : ''}${evt.location ? ` - ${evt.location}` : ''}.`;
    const memberName = user_email.split('@')[0];
    const staffMessage = `${memberName} RSVP'd for ${evt.title} on ${formattedDate}`;
    
    const result = await db.transaction(async (tx) => {
      const rsvpResult = await tx.insert(eventRsvps).values({
        eventId: event_id,
        userEmail: user_email,
      }).onConflictDoUpdate({
        target: [eventRsvps.eventId, eventRsvps.userEmail],
        set: { status: 'confirmed' },
      }).returning();
      
      await tx.insert(notifications).values({
        userEmail: user_email,
        title: 'Event RSVP Confirmed',
        message: memberMessage,
        type: 'event_rsvp',
        relatedId: event_id,
        relatedType: 'event'
      });
      
      await notifyAllStaffRequired(
        'New Event RSVP',
        staffMessage,
        'event_rsvp',
        event_id,
        'event'
      );
      
      return rsvpResult[0];
    });
    
    sendPushNotification(user_email, {
      title: 'RSVP Confirmed!',
      body: memberMessage,
      url: '/#/member-events'
    }).catch(err => console.error('Push notification failed:', err));
    
    res.status(201).json(result);
  } catch (error: any) {
    if (!isProduction) console.error('RSVP creation error:', error);
    res.status(500).json({ error: 'Failed to create RSVP. Staff notification is required.' });
  }
});

router.delete('/api/rsvps/:event_id/:user_email', async (req, res) => {
  try {
    const { event_id, user_email } = req.params;
    
    const eventData = await db.select({
      title: events.title,
      eventDate: events.eventDate,
    }).from(events).where(eq(events.id, parseInt(event_id)));
    
    if (eventData.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const evt = eventData[0];
    const formattedDate = formatDateDisplayWithDay(evt.eventDate);
    const memberName = user_email.split('@')[0];
    const staffMessage = `${memberName} cancelled their RSVP for ${evt.title} on ${formattedDate}`;
    
    await db.transaction(async (tx) => {
      await tx.update(eventRsvps)
        .set({ status: 'cancelled' })
        .where(and(
          eq(eventRsvps.eventId, parseInt(event_id)),
          eq(eventRsvps.userEmail, user_email)
        ));
      
      await notifyAllStaffRequired(
        'Event RSVP Cancelled',
        staffMessage,
        'event_rsvp_cancelled',
        parseInt(event_id),
        'event'
      );
    });
    
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('RSVP cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel RSVP. Staff notification is required.' });
  }
});

router.get('/api/events/:id/rsvps', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.select({
      id: eventRsvps.id,
      userEmail: eventRsvps.userEmail,
      status: eventRsvps.status,
      createdAt: eventRsvps.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
    })
    .from(eventRsvps)
    .leftJoin(users, eq(eventRsvps.userEmail, users.email))
    .where(and(
      eq(eventRsvps.eventId, parseInt(id)),
      eq(eventRsvps.status, 'confirmed')
    ))
    .orderBy(desc(eventRsvps.createdAt));
    
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

export default router;
