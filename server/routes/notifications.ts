import { Router } from 'express';
import { pool, isProduction } from '../core/db';

const router = Router();

router.get('/api/notifications', async (req, res) => {
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

router.get('/api/notifications/count', async (req, res) => {
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

router.put('/api/notifications/:id/read', async (req, res) => {
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

router.put('/api/notifications/mark-all-read', async (req, res) => {
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

export default router;
