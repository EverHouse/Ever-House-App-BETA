import { Router } from 'express';
import { pool, queryWithRetry } from '../core/db';
import { logAndRespond, createErrorResponse } from '../core/logger';

const router = Router();

function getSessionEmail(req: any): string | null {
  return (req.session as any)?.user?.email?.toLowerCase() || null;
}

function isAuthorizedForEmail(req: any, targetEmail: string): boolean {
  const sessionEmail = getSessionEmail(req);
  if (!sessionEmail) return false;
  return sessionEmail === targetEmail.toLowerCase();
}

router.get('/api/notifications', async (req, res) => {
  try {
    const { user_email: rawEmail, unread_only } = req.query;
    
    if (!rawEmail) {
      return res.status(400).json(createErrorResponse(req, 'user_email is required', 'MISSING_EMAIL'));
    }
    
    const user_email = decodeURIComponent(rawEmail as string);
    
    if (!isAuthorizedForEmail(req, user_email)) {
      return res.status(403).json(createErrorResponse(req, 'You can only access your own notifications', 'FORBIDDEN'));
    }
    
    let query = 'SELECT * FROM notifications WHERE user_email = $1';
    const params: any[] = [user_email];
    
    if (unread_only === 'true') {
      query += ' AND is_read = false';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await queryWithRetry(query, params);
    res.json(result.rows);
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to fetch notifications', error, 'NOTIFICATIONS_FETCH_ERROR');
  }
});

router.get('/api/notifications/count', async (req, res) => {
  try {
    const { user_email: rawEmail } = req.query;
    
    if (!rawEmail) {
      return res.status(400).json(createErrorResponse(req, 'user_email is required', 'MISSING_EMAIL'));
    }
    
    const user_email = decodeURIComponent(rawEmail as string);
    
    if (!isAuthorizedForEmail(req, user_email)) {
      return res.status(403).json(createErrorResponse(req, 'You can only access your own notifications', 'FORBIDDEN'));
    }
    
    const result = await queryWithRetry(
      'SELECT COUNT(*) as count FROM notifications WHERE user_email = $1 AND is_read = false',
      [user_email]
    );
    
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to fetch notification count', error, 'NOTIFICATION_COUNT_ERROR');
  }
});

router.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const sessionEmail = getSessionEmail(req);
    
    if (!sessionEmail) {
      return res.status(401).json(createErrorResponse(req, 'Authentication required', 'UNAUTHORIZED'));
    }
    
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_email = $2 RETURNING *',
      [id, sessionEmail]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(req, 'Notification not found or access denied', 'NOT_FOUND'));
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to update notification', error, 'NOTIFICATION_UPDATE_ERROR');
  }
});

router.put('/api/notifications/mark-all-read', async (req, res) => {
  try {
    const { user_email } = req.body;
    
    if (!user_email) {
      return res.status(400).json(createErrorResponse(req, 'user_email is required', 'MISSING_EMAIL'));
    }
    
    if (!isAuthorizedForEmail(req, user_email)) {
      return res.status(403).json(createErrorResponse(req, 'You can only modify your own notifications', 'FORBIDDEN'));
    }
    
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_email = $1 AND is_read = false',
      [user_email]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to mark notifications as read', error, 'MARK_ALL_READ_ERROR');
  }
});

router.delete('/api/notifications/dismiss-all', async (req, res) => {
  try {
    const { user_email } = req.body;
    
    if (!user_email) {
      return res.status(400).json(createErrorResponse(req, 'user_email is required', 'MISSING_EMAIL'));
    }
    
    if (!isAuthorizedForEmail(req, user_email)) {
      return res.status(403).json(createErrorResponse(req, 'You can only delete your own notifications', 'FORBIDDEN'));
    }
    
    const result = await pool.query(
      'DELETE FROM notifications WHERE user_email = $1',
      [user_email]
    );
    
    res.json({ success: true, deletedCount: result.rowCount });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to dismiss all notifications', error, 'DISMISS_ALL_ERROR');
  }
});

router.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sessionEmail = getSessionEmail(req);
    
    if (!sessionEmail) {
      return res.status(401).json(createErrorResponse(req, 'Authentication required', 'UNAUTHORIZED'));
    }
    
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_email = $2 RETURNING id',
      [id, sessionEmail]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(req, 'Notification not found or access denied', 'NOT_FOUND'));
    }
    
    res.json({ success: true, deletedId: parseInt(id) });
  } catch (error: any) {
    logAndRespond(req, res, 500, 'Failed to delete notification', error, 'NOTIFICATION_DELETE_ERROR');
  }
});

export default router;
