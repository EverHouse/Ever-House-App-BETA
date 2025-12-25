import { Router } from 'express';
import { isProduction } from '../core/db';
import { db } from '../db';
import { facilityClosures, pushSubscriptions, users } from '../../shared/schema';
import { eq, desc, or, isNull, and } from 'drizzle-orm';
import webpush from 'web-push';
import { isStaffOrAdmin } from '../core/middleware';

const router = Router();

export async function sendPushNotificationToAllMembers(payload: { title: string; body: string; url?: string }) {
  try {
    const subscriptions = await db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userEmail, users.email))
      .where(or(eq(users.role, 'member'), isNull(users.role)));
    
    const notifications = subscriptions.map(async (sub) => {
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
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        }
      }
    });
    
    await Promise.all(notifications);
    console.log(`[Push] Sent notification to ${subscriptions.length} members`);
  } catch (error) {
    console.error('Failed to send push notification to members:', error);
  }
}

router.get('/api/closures', async (req, res) => {
  try {
    const results = await db
      .select()
      .from(facilityClosures)
      .where(eq(facilityClosures.isActive, true))
      .orderBy(desc(facilityClosures.startDate), desc(facilityClosures.startTime));
    res.json(results);
  } catch (error: any) {
    if (!isProduction) console.error('Closures fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch closures' });
  }
});

router.post('/api/closures', isStaffOrAdmin, async (req, res) => {
  try {
    const { 
      title, 
      reason, 
      start_date, 
      start_time,
      end_date, 
      end_time,
      affected_areas, 
      notify_members,
      created_by 
    } = req.body;
    
    if (!start_date || !affected_areas) {
      return res.status(400).json({ error: 'Start date and affected areas are required' });
    }
    
    const [result] = await db.insert(facilityClosures).values({
      title: title || 'Facility Closure',
      reason,
      startDate: start_date,
      startTime: start_time || null,
      endDate: end_date || start_date,
      endTime: end_time || null,
      affectedAreas: affected_areas,
      isActive: true,
      createdBy: created_by
    }).returning();
    
    if (notify_members && reason) {
      const affectedText = affected_areas === 'entire_facility' 
        ? 'the entire facility' 
        : affected_areas === 'all_bays' 
          ? 'all simulator bays' 
          : affected_areas;
          
      await sendPushNotificationToAllMembers({
        title: 'Facility Update',
        body: reason,
        url: '/announcements'
      });
    }
    
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Closure create error:', error);
    res.status(500).json({ error: 'Failed to create closure' });
  }
});

router.delete('/api/closures/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .update(facilityClosures)
      .set({ isActive: false })
      .where(eq(facilityClosures.id, parseInt(id)));
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Closure delete error:', error);
    res.status(500).json({ error: 'Failed to delete closure' });
  }
});

export default router;
