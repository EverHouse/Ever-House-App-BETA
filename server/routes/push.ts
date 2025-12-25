import { Router } from 'express';
import webpush from 'web-push';
import { pool, isProduction } from '../core/db';
import { db } from '../db';
import { pushSubscriptions, users, notifications, events, eventRsvps, bookingRequests, wellnessClasses, wellnessEnrollments } from '../../shared/schema';
import { eq, inArray, and, sql } from 'drizzle-orm';

const router = Router();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@everhouse.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushNotification(userEmail: string, payload: { title: string; body: string; url?: string }) {
  try {
    const result = await pool.query(
      'SELECT * FROM push_subscriptions WHERE user_email = $1',
      [userEmail]
    );
    
    const notifications = result.rows.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      
      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
      }
    });
    
    await Promise.all(notifications);
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

export async function sendPushNotificationToStaff(payload: { title: string; body: string; url?: string }) {
  try {
    const staffSubscriptions = await db
      .selectDistinct({
        id: pushSubscriptions.id,
        userEmail: pushSubscriptions.userEmail,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userEmail, users.email))
      .where(inArray(users.role, ['admin', 'staff']));
    
    const notifications = staffSubscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      
      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
      }
    });
    
    await Promise.all(notifications);
  } catch (error) {
    console.error('Failed to send push notification to staff:', error);
  }
}

router.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/api/push/subscribe', async (req, res) => {
  try {
    const { subscription, user_email } = req.body;
    
    if (!subscription || !user_email) {
      return res.status(400).json({ error: 'subscription and user_email are required' });
    }
    
    const { endpoint, keys } = subscription;
    
    await pool.query(
      `INSERT INTO push_subscriptions (user_email, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_email = $1,
         p256dh = $3,
         auth = $4`,
      [user_email, endpoint, keys.p256dh, keys.auth]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Push subscription error:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

router.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }
    
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

router.post('/api/push/test', async (req, res) => {
  try {
    const { user_email } = req.body;
    
    if (!user_email) {
      return res.status(400).json({ error: 'user_email is required' });
    }
    
    await sendPushNotification(user_email, {
      title: 'Test Notification',
      body: 'This is a test push notification from Even House!',
      url: '/#/dashboard'
    });
    
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Test push error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export async function sendDailyReminders() {
  const results = { events: 0, bookings: 0, wellness: 0, pushFailed: 0, errors: [] as string[] };
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const eventReminders = await db.select({
      userEmail: eventRsvps.userEmail,
      eventId: events.id,
      title: events.title,
      eventDate: events.eventDate,
      startTime: events.startTime,
      location: events.location
    })
    .from(eventRsvps)
    .innerJoin(events, eq(eventRsvps.eventId, events.id))
    .where(and(
      eq(eventRsvps.status, 'confirmed'),
      sql`DATE(${events.eventDate}) = ${tomorrowStr}`
    ));
    
    if (eventReminders.length > 0) {
      const eventNotifications = eventReminders.map(evt => ({
        userEmail: evt.userEmail,
        title: 'Event Tomorrow',
        message: `Reminder: ${evt.title} is tomorrow${evt.startTime ? ` at ${evt.startTime.substring(0, 5)}` : ''}${evt.location ? ` - ${evt.location}` : ''}.`,
        type: 'event_reminder' as const,
        relatedId: evt.eventId,
        relatedType: 'event' as const
      }));
      
      try {
        await db.insert(notifications).values(eventNotifications);
        results.events = eventNotifications.length;
      } catch (err: any) {
        results.errors.push(`Event batch insert: ${err.message}`);
      }
      
      for (const evt of eventReminders) {
        const message = `Reminder: ${evt.title} is tomorrow${evt.startTime ? ` at ${evt.startTime.substring(0, 5)}` : ''}${evt.location ? ` - ${evt.location}` : ''}.`;
        sendPushNotification(evt.userEmail, { title: 'Event Tomorrow', body: message, url: '/#/member-events' })
          .catch(() => { results.pushFailed++; });
      }
    }
    
    const bookingReminders = await db.select({
      userEmail: bookingRequests.userEmail,
      id: bookingRequests.id,
      requestDate: bookingRequests.requestDate,
      startTime: bookingRequests.startTime,
      bayId: bookingRequests.bayId
    })
    .from(bookingRequests)
    .where(and(
      eq(bookingRequests.status, 'approved'),
      sql`DATE(${bookingRequests.requestDate}) = ${tomorrowStr}`
    ));
    
    if (bookingReminders.length > 0) {
      const bookingNotifications = bookingReminders.map(booking => ({
        userEmail: booking.userEmail,
        title: 'Booking Tomorrow',
        message: `Reminder: Your simulator booking is tomorrow at ${booking.startTime.substring(0, 5)}${booking.bayId ? ` on Bay ${booking.bayId}` : ''}.`,
        type: 'booking_reminder' as const,
        relatedId: booking.id,
        relatedType: 'booking_request' as const
      }));
      
      try {
        await db.insert(notifications).values(bookingNotifications);
        results.bookings = bookingNotifications.length;
      } catch (err: any) {
        results.errors.push(`Booking batch insert: ${err.message}`);
      }
      
      for (const booking of bookingReminders) {
        const message = `Reminder: Your simulator booking is tomorrow at ${booking.startTime.substring(0, 5)}${booking.bayId ? ` on Bay ${booking.bayId}` : ''}.`;
        sendPushNotification(booking.userEmail, { title: 'Booking Tomorrow', body: message, url: '/#/sims' })
          .catch(() => { results.pushFailed++; });
      }
    }
    
    const wellnessReminders = await db.select({
      userEmail: wellnessEnrollments.userEmail,
      classId: wellnessClasses.id,
      title: wellnessClasses.title,
      date: wellnessClasses.date,
      time: wellnessClasses.time,
      instructor: wellnessClasses.instructor
    })
    .from(wellnessEnrollments)
    .innerJoin(wellnessClasses, eq(wellnessEnrollments.classId, wellnessClasses.id))
    .where(and(
      eq(wellnessEnrollments.status, 'confirmed'),
      sql`DATE(${wellnessClasses.date}) = ${tomorrowStr}`
    ));
    
    if (wellnessReminders.length > 0) {
      const wellnessNotifications = wellnessReminders.map(cls => ({
        userEmail: cls.userEmail,
        title: 'Wellness Class Tomorrow',
        message: `Reminder: ${cls.title} with ${cls.instructor} is tomorrow at ${cls.time}.`,
        type: 'wellness_reminder' as const,
        relatedId: cls.classId,
        relatedType: 'wellness_class' as const
      }));
      
      try {
        await db.insert(notifications).values(wellnessNotifications);
        results.wellness = wellnessNotifications.length;
      } catch (err: any) {
        results.errors.push(`Wellness batch insert: ${err.message}`);
      }
      
      for (const cls of wellnessReminders) {
        const message = `Reminder: ${cls.title} with ${cls.instructor} is tomorrow at ${cls.time}.`;
        sendPushNotification(cls.userEmail, { title: 'Class Tomorrow', body: message, url: '/#/member-wellness' })
          .catch(() => { results.pushFailed++; });
      }
    }
    
  console.log(`[Daily Reminders] Sent ${results.events} event, ${results.bookings} booking, ${results.wellness} wellness reminders. Push failures: ${results.pushFailed}`);
  
  return {
    success: true,
    message: `Sent ${results.events} event, ${results.bookings} booking, and ${results.wellness} wellness reminders`,
    ...results
  };
}

router.post('/api/push/send-daily-reminders', async (req, res) => {
  try {
    const result = await sendDailyReminders();
    res.json(result);
  } catch (error: any) {
    console.error('Daily reminders error:', error);
    res.status(500).json({ error: 'Failed to send daily reminders' });
  }
});

export default router;
