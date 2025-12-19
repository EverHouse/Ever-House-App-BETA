import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { isAuthorizedForMemberBooking, MEMBER_BOOKING_PRODUCT_ID } from '../core/trackman';

const router = Router();

router.get('/api/resources', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM resources ORDER BY type, name');
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

router.get('/api/bookings', async (req, res) => {
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

router.post('/api/bookings', async (req, res) => {
  try {
    const { resource_id, user_email, booking_date, start_time, end_time, notes } = req.body;
    
    const userResult = await pool.query(
      `SELECT tier, tags FROM users WHERE email = $1`,
      [user_email]
    );
    
    const user = userResult.rows[0];
    const userTier = user?.tier || 'Social';
    let userTags: string[] = [];
    try {
      if (user?.tags) {
        userTags = typeof user.tags === 'string' ? JSON.parse(user.tags) : (Array.isArray(user.tags) ? user.tags : []);
      }
    } catch { userTags = []; }
    
    const isMemberAuthorized = isAuthorizedForMemberBooking(userTier, userTags);
    
    if (!isMemberAuthorized) {
      return res.status(402).json({ 
        error: 'Payment required',
        bookingType: 'payment_required',
        message: 'Your membership tier requires payment for simulator bookings'
      });
    }
    
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
      [resource_id, user_email, booking_date, start_time, end_time, notes || null]
    );
    
    res.status(201).json({
      ...result.rows[0],
      bookingType: 'member',
      trackmanProductId: MEMBER_BOOKING_PRODUCT_ID
    });
  } catch (error: any) {
    if (!isProduction) console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
