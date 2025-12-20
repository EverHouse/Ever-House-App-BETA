import { Router } from 'express';
import webpush from 'web-push';
import { pool, isProduction } from '../core/db';
import { db } from '../db';
import { pushSubscriptions, users } from '../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

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

export default router;
