import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import webpush from 'web-push';
import { isStaffOrAdmin } from '../core/middleware';

const router = Router();

export async function sendPushNotificationToAllMembers(payload: { title: string; body: string; url?: string }) {
  try {
    const result = await pool.query(`
      SELECT ps.endpoint, ps.p256dh, ps.auth 
      FROM push_subscriptions ps
      INNER JOIN users u ON ps.user_email = u.email
      WHERE u.role = 'member' OR u.role IS NULL
    `);
    
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
    console.log(`[Push] Sent notification to ${result.rows.length} members`);
  } catch (error) {
    console.error('Failed to send push notification to members:', error);
  }
}

router.get('/api/closures', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM facility_closures 
      WHERE is_active = true 
      ORDER BY start_date DESC, start_time DESC NULLS LAST
    `);
    res.json(result.rows);
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
    
    const result = await pool.query(`
      INSERT INTO facility_closures (title, reason, start_date, start_time, end_date, end_time, affected_areas, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
      RETURNING *
    `, [
      title || 'Facility Closure',
      reason,
      start_date,
      start_time || null,
      end_date || start_date,
      end_time || null,
      affected_areas,
      created_by
    ]);
    
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
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Closure create error:', error);
    res.status(500).json({ error: 'Failed to create closure' });
  }
});

router.delete('/api/closures/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE facility_closures SET is_active = false WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Closure delete error:', error);
    res.status(500).json({ error: 'Failed to delete closure' });
  }
});

export default router;
